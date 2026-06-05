/**
 * Gemini Multimodal Live API WebSocket client.
 *
 * Connects directly to the Gemini Live API via wss:// using the
 * BidiGenerateContent endpoint with protobuf-encoded messages.
 *
 * Reference: https://ai.google.dev/api/gemini-live
 *
 * Protocol overview:
 * - Client sends BidiGenerateContentClientContent messages
 *   containing audio chunks (16kHz 16-bit PCM) and text.
 * - Server sends BidiGenerateContentServerContent messages
 *   containing audio chunks (24kHz 16-bit PCM) and text.
 * - The connection is stateful — the server maintains conversation context.
 */

import type { VoiceConnectionState, GeminiLiveConfig } from '../types';

// Gemini Live API endpoints
const GEMINI_LIVE_HOST = 'generativelanguage.googleapis.com';
const GEMINI_LIVE_PATH = '/google.ai.generativelanguage.v1.GenerativeService/BidiGenerateContent';

export type GeminiMessageType =
  | 'audio_out'       // Server → Client: PCM audio at 24kHz
  | 'text_out'        // Server → Client: Text transcript of AI response
  | 'text_in'         // Client → Server: Text input
  | 'audio_in'        // Client → Server: PCM audio at 16kHz
  | 'tool_call'       // Server → Client: Function call request
  | 'tool_response'   // Client → Server: Function call result
  | 'turn_complete'   // Server → Client: AI has finished responding
  | 'interrupt';      // Client → Server: User interruption

export interface GeminiLiveMessage {
  type: GeminiMessageType;
  data?: string;            // Text content or JSON for tool calls
  audioData?: Int16Array;   // PCM audio data
  audioSampleRate?: number; // Sample rate of audio data
  toolName?: string;
  toolArguments?: Record<string, unknown>;
}

export interface GeminiWebSocketCallbacks {
  onAudioOut: (pcmData: Int16Array, sampleRate: number) => void;
  onTextOut: (text: string) => void;
  onTurnComplete: () => void;
  onToolCall: (name: string, args: Record<string, unknown>, callId: string) => void;
  onConnectionStateChange: (state: VoiceConnectionState) => void;
  onError: (error: string) => void;
}

/**
 * Build a setup message to initialize the Gemini Live session.
 * This is sent as the first WebSocket message after connection.
 */
function buildSetupMessage(config: GeminiLiveConfig): ArrayBuffer {
  // Gemini Live uses a simple JSON-based setup, then binary audio frames
  const setupPayload = {
    setup: {
      model: `models/${config.model}`,
      generation_config: {
        response_modalities: ['AUDIO'],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: 'Puck', // Options: Puck, Charon, Kore, Fenrir, Aoede
            },
          },
        },
      },
      system_instruction: {
        parts: [{ text: config.systemPrompt }],
      },
      tools: config.tools?.map((t) => ({
        function_declarations: [
          {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        ],
      })) || [],
    },
  };

  return new TextEncoder().encode(JSON.stringify(setupPayload)).buffer as ArrayBuffer;
}

/**
 * Build a binary audio frame message for sending PCM data.
 * Format: JSON header line + newline + raw PCM bytes
 */
function buildAudioFrame(audioData: Int16Array): ArrayBuffer {
  const header = JSON.stringify({
    realtime_input: {
      media_chunks: [
        {
          data: '', // Will be replaced by raw bytes
          mime_type: 'audio/pcm;rate=16000',
        },
      ],
    },
  });

  const headerBytes = new TextEncoder().encode(header + '\n');
  const audioBytes = new Uint8Array(audioData.buffer as ArrayBuffer);

  const combined = new Uint8Array(headerBytes.length + audioBytes.length);
  combined.set(headerBytes, 0);
  combined.set(audioBytes, headerBytes.length);

  return combined.buffer as ArrayBuffer;
}

/**
 * Build a text input message to send to Gemini.
 */
function buildTextFrame(text: string): ArrayBuffer {
  const payload = JSON.stringify({
    realtime_input: {
      language_code: 'en-US',
      text: text,
    },
  });
  return new TextEncoder().encode(payload + '\n').buffer as ArrayBuffer;
}

/**
 * Build an interruption signal to flush the server's audio queue.
 */
function buildInterruptFrame(): ArrayBuffer {
  const payload = JSON.stringify({
    realtime_input: {
      force_interrupt: true,
    },
  });
  return new TextEncoder().encode(payload + '\n').buffer as ArrayBuffer;
}

/**
 * Build a tool response frame.
 */
function buildToolResponseFrame(name: string, response: unknown, callId: string): ArrayBuffer {
  const payload = JSON.stringify({
    tool_response: {
      function_responses: [
        {
          id: callId,
          name,
          response,
        },
      ],
    },
  });
  return new TextEncoder().encode(payload + '\n').buffer as ArrayBuffer;
}

/**
 * Parse incoming messages from the Gemini Live WebSocket.
 * Messages are JSON lines potentially followed by binary audio data.
 */
function parseServerMessage(data: ArrayBuffer | string): GeminiLiveMessage[] {
  const messages: GeminiLiveMessage[] = [];

  if (typeof data === 'string') {
    // JSON text message
    try {
      const parsed = JSON.parse(data);
      parseServerJson(parsed, messages);
    } catch {
      // Ignore parse errors
    }
    return messages;
  }

  // Binary data — could be JSON + audio mixed
  const uint8 = new Uint8Array(data);
  const text = new TextDecoder().decode(uint8);

  // Try to find JSON header (it's a line of JSON followed by optional binary)
  const newlineIdx = text.indexOf('\n');
  if (newlineIdx !== -1) {
    const headerText = text.substring(0, newlineIdx);
    try {
      const parsed = JSON.parse(headerText);
      parseServerJson(parsed, messages);
    } catch {
      // If header parse fails, might be pure audio
      handleAudioChunk(uint8, messages);
    }

    // Check for trailing audio data after the newline
    const trailingBytes = uint8.slice(newlineIdx + 1);
    if (trailingBytes.length > 0) {
      handleAudioChunk(trailingBytes, messages);
    }
  } else {
    // Pure binary — likely audio
    handleAudioChunk(uint8, messages);
  }

  return messages;
}

function parseServerJson(parsed: Record<string, unknown>, messages: GeminiLiveMessage[]): void {
  // Check for setup complete acknowledgment
  if (parsed.setupComplete) {
    return;
  }

  // Handle server content
  const serverContent = parsed.serverContent as Record<string, unknown> | undefined;
  if (!serverContent) return;

  const modelTurn = serverContent.modelTurn as Record<string, unknown> | undefined;
  if (!modelTurn) return;

  const parts = modelTurn.parts as Array<Record<string, unknown>> | undefined;
  if (!parts) return;

  for (const part of parts) {
    // Text part
    if (part.text !== undefined) {
      messages.push({
        type: 'text_out',
        data: part.text as string,
      });
    }

    // Inline audio data (may arrive as base64 in JSON)
    const inlineData = part.inlineData as Record<string, unknown> | undefined;
    if (inlineData) {
      const mimeType = inlineData.mimeType as string || '';
      if (mimeType.includes('audio')) {
        const base64 = inlineData.data as string;
        if (base64) {
          const binaryStr = atob(base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const sampleRate = mimeType.includes('24000') ? 24000 : 24000;
          messages.push({
            type: 'audio_out',
            audioData: new Int16Array(bytes.buffer),
            audioSampleRate: sampleRate,
          });
        }
      }
    }

    // Function call
    const functionCall = part.functionCall as Record<string, unknown> | undefined;
    if (functionCall) {
      messages.push({
        type: 'tool_call',
        data: JSON.stringify(functionCall),
        toolName: functionCall.name as string,
        toolArguments: functionCall.args as Record<string, unknown>,
      });
    }
  }

  // Check if turn is complete
  if (serverContent.turnComplete) {
    messages.push({ type: 'turn_complete' });
  }
}

function handleAudioChunk(bytes: Uint8Array, messages: GeminiLiveMessage[]): void {
  // Audio data is raw 16-bit PCM 24kHz
  if (bytes.length >= 2) {
    const int16 = new Int16Array(bytes.byteLength / 2);
    for (let i = 0; i < int16.length; i++) {
      int16[i] = (bytes[i * 2 + 1] << 8) | bytes[i * 2];
    }

    if (int16.length > 0) {
      messages.push({
        type: 'audio_out',
        audioData: int16,
        audioSampleRate: 24000,
      });
    }
  }
}

/**
 * Gemini Live API WebSocket manager.
 */
export class GeminiLiveWebSocket {
  private ws: WebSocket | null = null;
  private config: GeminiLiveConfig;
  private callbacks: GeminiWebSocketCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private shouldReconnect = false;

  constructor(config: GeminiLiveConfig, callbacks: GeminiWebSocketCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.shouldReconnect = true;
    this.callbacks.onConnectionStateChange('connecting');

    try {
      const url = `wss://${GEMINI_LIVE_HOST}/ws/${GEMINI_LIVE_PATH}?key=${this.config.apiKey}`;

      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.callbacks.onConnectionStateChange('connected');

        // Send setup message
        const setupMsg = buildSetupMessage(this.config);
        this.ws!.send(setupMsg);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        const messages = parseServerMessage(event.data);
        for (const msg of messages) {
          this.handleMessage(msg);
        }
      };

      this.ws.onclose = () => {
        this.callbacks.onConnectionStateChange('disconnected');
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 8000);
          setTimeout(() => this.connect(), delay);
        }
      };

      this.ws.onerror = () => {
        this.callbacks.onConnectionStateChange('error');
        this.callbacks.onError('WebSocket connection error');
      };

      // Wait for the connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 15000);

        const checkOpen = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearTimeout(timeout);
            // Wait a moment for setup to complete
            setTimeout(resolve, 500);
          } else if (this.ws?.readyState === WebSocket.CLOSED || this.ws?.readyState === WebSocket.CLOSING) {
            clearTimeout(timeout);
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkOpen, 100);
          }
        };
        checkOpen();
      });
    } catch (err) {
      this.callbacks.onConnectionStateChange('error');
      this.callbacks.onError(
        `Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
      throw err;
    }
  }

  /**
   * Send a PCM audio chunk to the server (16kHz, 16-bit).
   */
  sendAudio(pcmData: Int16Array): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const frame = buildAudioFrame(pcmData);
    this.ws.send(frame);
  }

  /**
   * Send text input to the server.
   */
  sendText(text: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const frame = buildTextFrame(text);
    this.ws.send(frame);
  }

  /**
   * Signal interruption (user started speaking).
   * This flushes the server's audio queue, enabling turn-taking.
   */
  sendInterrupt(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const frame = buildInterruptFrame();
    this.ws.send(frame);

    // Send an interrupt message type as well for local handling
    // This triggers barge-in on the client side
  }

  /**
   * Send a tool response back to the server.
   */
  sendToolResponse(name: string, response: unknown, callId: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const frame = buildToolResponseFrame(name, response, callId);
    this.ws.send(frame);
  }

  /**
   * Disconnect and clean up.
   */
  disconnect(): void {
    this.shouldReconnect = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.callbacks.onConnectionStateChange('disconnected');
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(msg: GeminiLiveMessage): void {
    switch (msg.type) {
      case 'audio_out':
        if (msg.audioData) {
          this.callbacks.onAudioOut(msg.audioData, msg.audioSampleRate || 24000);
        }
        break;

      case 'text_out':
        if (msg.data) {
          this.callbacks.onTextOut(msg.data);
        }
        break;

      case 'tool_call':
        if (msg.toolName) {
          // Generate a call ID and pass to the callback
          this.callbacks.onToolCall(
            msg.toolName,
            msg.toolArguments || {},
            crypto.randomUUID()
          );
        }
        break;

      case 'turn_complete':
        this.callbacks.onTurnComplete();
        break;
    }
  }
}
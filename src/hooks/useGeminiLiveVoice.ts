/**
 * React hook for Gemini Multimodal Live API voice chat.
 * Manages the full lifecycle: microphone capture, WebSocket connection,
 * audio playback, barge-in interruption, and conversation state.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioCapture } from '../voice/audioCapture';
import { AudioPlayback } from '../voice/audioPlayback';
import { GeminiLiveWebSocket } from '../voice/geminiLiveWebSocket';
import type {
  VoiceConnectionState,
  VoiceActivityState,
  GeminiLiveConfig,
} from '../types';

export interface VoiceChatOptions {
  apiKey: string;
  model?: string; // default: gemini-2.0-flash-live-001
  systemPrompt: string;
  onTranscript?: (text: string) => void;
  onAIText?: (text: string) => void;
  onError?: (error: string) => void;
  onTurnComplete?: () => void;
  onToolCall?: (name: string, args: Record<string, unknown>, respond: (result: unknown) => void) => void;
}

export interface VoiceChatState {
  connectionState: VoiceConnectionState;
  activityState: VoiceActivityState;
  isMicMuted: boolean;
  isSpeakerMuted: boolean;
  transcript: string;
  aiTranscript: string;
  audioLevel: number;
}

export function useGeminiLiveVoice(options: VoiceChatOptions) {
  const {
    apiKey,
    model = 'gemini-2.0-flash-live-001',
    systemPrompt,
    onTranscript,
    onAIText,
    onError,
    onTurnComplete,
    onToolCall,
  } = options;

  const [connectionState, setConnectionState] = useState<VoiceConnectionState>('idle');
  const [activityState, setActivityState] = useState<VoiceActivityState>('silent');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<GeminiLiveWebSocket | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);
  const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserSpeakingRef = useRef(false);
  const currentTranscriptRef = useRef('');

  // Define stopMicrophone first so it's available everywhere
  const stopMicrophone = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    isUserSpeakingRef.current = false;
  }, []);

  // Define stopVoice next so it's available everywhere
  const stopVoice = useCallback(() => {
    stopMicrophone();

    wsRef.current?.disconnect();
    wsRef.current = null;

    setConnectionState('idle');
    setActivityState('silent');
    setAudioLevel(0);
    setTranscript('');
    setAiTranscript('');

    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
  }, [stopMicrophone]);

  // Initialize on mount, cleanup on unmount
  useEffect(() => {
    playbackRef.current = new AudioPlayback((isPlaying) => {
      if (isPlaying) {
        setActivityState('speaking');
      } else {
        setActivityState('silent');
      }
    });

    return () => {
      stopVoice();
      playbackRef.current?.close();
    };
  }, [stopVoice]);

  /**
   * Start the voice chat session: connect WebSocket, start mic capture.
   */
  const startVoice = useCallback(async () => {
    if (connectionState === 'connected' || connectionState === 'connecting') return;

    setTranscript('');
    setAiTranscript('');
    currentTranscriptRef.current = '';

    try {
      const config: GeminiLiveConfig = {
        apiKey,
        model,
        systemPrompt,
      };

      const playback = playbackRef.current;
      if (!playback) throw new Error('Audio playback not initialized');

      await playback.init();

      // Create WebSocket connection
      const ws = new GeminiLiveWebSocket(config, {
        onAudioOut: (pcmData) => {
          playback.enqueueAudio(pcmData);
        },
        onTextOut: (text) => {
          currentTranscriptRef.current += text;
          setAiTranscript(currentTranscriptRef.current);
          onAIText?.(currentTranscriptRef.current);
        },
        onTurnComplete: () => {
          onTurnComplete?.();
          setAiTranscript((prev) => prev + '\n\n');
          currentTranscriptRef.current = '';
        },
        onToolCall: (name, args, callId) => {
          onToolCall?.(name, args, (result) => {
            ws.sendToolResponse(name, result, callId);
          });
        },
        onConnectionStateChange: (state) => {
          setConnectionState(state);
          if (state === 'connected') {
            setActivityState('silent');
          }
          if (state === 'error' || state === 'disconnected') {
            setActivityState('silent');
            stopMicrophone();
          }
        },
        onError: (err) => {
          onError?.(err);
        },
      });

      await ws.connect();
      wsRef.current = ws;
      setConnectionState('connected');

      // Start microphone capture
      const capture = new AudioCapture({
        targetSampleRate: 16000,
        onAudioData: (pcmData) => {
          if (!isMicMuted && ws.isConnected) {
            ws.sendAudio(pcmData);
          }
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);

          // Voice Activity Detection (VAD)
          const SPEAKING_THRESHOLD = 0.015;
          const isCurrentlySpeaking = level > SPEAKING_THRESHOLD;

          if (isCurrentlySpeaking && !isUserSpeakingRef.current) {
            // User just started speaking — barge-in
            isUserSpeakingRef.current = true;
            setActivityState('listening');
            playback.flush(); // Flush local audio queue
            ws.sendInterrupt(); // Signal server to stop generating
          } else if (!isCurrentlySpeaking && isUserSpeakingRef.current) {
            // User stopped speaking
            isUserSpeakingRef.current = false;
            setActivityState('silent');
          }
        },
      });

      await capture.start();
      captureRef.current = capture;
      setIsMicMuted(false);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start voice chat';
      onError?.(msg);
      setConnectionState('error');
      setActivityState('silent');
      stopMicrophone();
    }
  }, [apiKey, model, systemPrompt, isMicMuted, connectionState, onError, onAIText, onTurnComplete, onToolCall]);

  /**
   * Toggle microphone mute.
   */
  const toggleMic = useCallback(() => {
    setIsMicMuted((prev) => !prev);
  }, []);

  /**
   * Toggle speaker mute.
   */
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerMuted((prev) => {
      const newVal = !prev;
      playbackRef.current?.setVolume(newVal ? 0 : 1);
      return newVal;
    });
  }, []);

  /**
   * Send a text message through the voice connection.
   */
  const sendTextMessage = useCallback((text: string) => {
    wsRef.current?.sendText(text);
    setTranscript((prev) => prev + (prev ? '\n' : '') + `You: ${text}`);
    onTranscript?.(text);
  }, [onTranscript]);

  /**
   * Send a custom tool response.
   */
  const sendToolResponse = useCallback((name: string, response: unknown, callId: string) => {
    wsRef.current?.sendToolResponse(name, response, callId);
  }, []);

  const state: VoiceChatState = {
    connectionState,
    activityState,
    isMicMuted,
    isSpeakerMuted,
    transcript,
    aiTranscript,
    audioLevel,
  };

  return {
    state,
    startVoice,
    stopVoice,
    toggleMic,
    toggleSpeaker,
    sendTextMessage,
    sendToolResponse,
  };
}
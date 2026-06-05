/**
 * Microphone audio capture module.
 * Uses AudioContext + ScriptProcessorNode for broader browser compatibility.
 * Outputs 16-bit PCM at 16kHz.
 */

export type AudioCaptureCallback = (pcmData: Int16Array) => void;
export type AudioLevelCallback = (level: number) => void;

export interface AudioCaptureConfig {
  targetSampleRate?: number; // default 16000
  onAudioData: AudioCaptureCallback;
  onAudioLevel?: AudioLevelCallback;
}

export class AudioCapture {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isActive = false;
  private targetSampleRate: number;
  private onAudioData: AudioCaptureCallback;
  private onAudioLevel?: AudioLevelCallback;
  private resampleBuffer: number[] = [];

  constructor(config: AudioCaptureConfig) {
    this.targetSampleRate = config.targetSampleRate || 16000;
    this.onAudioData = config.onAudioData;
    this.onAudioLevel = config.onAudioLevel;
  }

  async start(): Promise<void> {
    if (this.isActive) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: { ideal: 48000 },
        },
      });

      // Use regular AudioContext (not AudioWorklet for broader compat)
      this.context = new AudioContext({ sampleRate: 48000 });

      this.source = this.context.createMediaStreamSource(this.stream);

      // ScriptProcessorNode for audio data capture
      const bufferSize = 4096;
      this.processor = this.context.createScriptProcessor(bufferSize, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isActive) return;
        this.processAudioChunk(e.inputBuffer.getChannelData(0));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.context.destination);

      this.isActive = true;
    } catch (err) {
      this.cleanup();
      const errMsg = `Microphone access denied: ${err instanceof Error ? err.message : 'Unknown error'}`;
      const error = new Error(errMsg);
      if (err instanceof Error) {
        error.cause = err;
      }
      throw error;
    }
  }

  stop(): void {
    this.isActive = false;
    this.cleanup();
  }

  get isRunning(): boolean {
    return this.isActive;
  }

  private processAudioChunk(samples: Float32Array): void {
    // Resample from 48kHz to target sample rate (16kHz)
    const resampleRatio = this.targetSampleRate / this.context!.sampleRate;
    this.resampleBuffer.push(...Array.from(samples));

    const frameSize = Math.floor(this.targetSampleRate * 0.02); // 20ms frames
    const availableSamples = Math.floor(this.resampleBuffer.length * resampleRatio);

    if (availableSamples >= frameSize) {
      const needed = Math.floor(frameSize / resampleRatio);
      const chunk = this.resampleBuffer.splice(0, needed);

      // Downsample
      const downsampled: number[] = [];
      const step = this.context!.sampleRate / this.targetSampleRate;

      for (let i = 0; i < chunk.length; i += step) {
        const idx = Math.floor(i);
        if (idx < chunk.length) {
          downsampled.push(chunk[idx]);
        }
      }

      if (downsampled.length >= frameSize) {
        const pcmData = this.float32ToInt16(new Float32Array(downsampled));

        // Calculate audio level (RMS) for VAD
        if (this.onAudioLevel) {
          let sumSquares = 0;
          for (let i = 0; i < pcmData.length; i++) {
            const normalized = pcmData[i] / 32768;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / pcmData.length);
          this.onAudioLevel(rms);
        }

        this.onAudioData(pcmData);
      }
    }
  }

  private float32ToInt16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  }

  private cleanup(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.resampleBuffer = [];
  }
}
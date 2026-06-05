/**
 * Audio playback module.
 * Manages a queue of 24kHz PCM audio chunks from Gemini and plays them
 * smoothly via Web Audio API. Supports barge-in interruption.
 */

export class AudioPlayback {
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private scheduledEndTime = 0;
  private isInterrupted = false;
  private onPlaybackStateChange: ((isPlaying: boolean) => void) | null = null;

  constructor(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange ?? null;
  }

  async init(): Promise<void> {
    this.context = new AudioContext({ sampleRate: 24000 });
    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.context.destination);
    this.scheduledEndTime = this.context.currentTime;
  }

  /**
   * Queue a 24kHz PCM audio chunk for playback.
   * @param pcmData Raw 16-bit PCM samples at 24kHz.
   */
  enqueueAudio(pcmData: Int16Array): void {
    if (!this.context || !this.gainNode || this.isInterrupted) return;

    // Convert Int16 to Float32
    const float32 = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      float32[i] = pcmData[i] / 32768;
    }

    const audioBuffer = this.context.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    const now = this.context.currentTime;
    const startTime = Math.max(this.scheduledEndTime, now);

    // Small gap (3ms) between chunks to prevent glitching
    source.start(startTime);
    this.scheduledEndTime = startTime + audioBuffer.duration;

    source.onended = () => {
      if (this.context && this.context.currentTime >= this.scheduledEndTime - 0.01) {
        this.onPlaybackStateChange?.(false);
      }
    };

    if (now < startTime + audioBuffer.duration) {
      this.onPlaybackStateChange?.(true);
    }
  }

  /**
   * Immediately flush all queued audio (barge-in).
   * Called when the user starts speaking during playback.
   */
  flush(): void {
    this.isInterrupted = true;
    this.scheduledEndTime = this.context?.currentTime ?? 0;
    this.onPlaybackStateChange?.(false);

    // Briefly disconnect and reconnect the gain node to stop all scheduled audio
    if (this.gainNode && this.context) {
      try {
        this.gainNode.disconnect();
        this.gainNode.connect(this.context.destination);
      } catch {
        // Ignore disconnect errors
      }
    }

    // Reset interruption flag after a small delay to allow flush
    setTimeout(() => {
      this.isInterrupted = false;
    }, 50);
  }

  /**
   * Set output volume.
   * @param value Volume 0.0 to 1.0
   */
  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  get isPlaying(): boolean {
    if (!this.context) return false;
    return this.context.currentTime < this.scheduledEndTime - 0.05;
  }

  close(): void {
    this.flush();
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }
    this.gainNode = null;
    this.scheduledEndTime = 0;
  }
}
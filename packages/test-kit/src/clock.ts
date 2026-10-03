export type ClockListener = (timeMs: number) => void;

/**
 * Deterministic clock controlled manually.
 * Emits time updates synchronously to subscribers.
 */
export class ManualClock {
  private currentTimeMs: number;
  private readonly listeners: Set<ClockListener> = new Set();
  private playing = false;
  private rate = 1.0;

  constructor(initialTimeMs = 0) {
    this.currentTimeMs = initialTimeMs;
  }

  now(): number {
    return this.currentTimeMs;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getRate(): number {
    return this.rate;
  }

  setRate(newRate: number): void {
    this.rate = Math.max(0.1, Math.min(newRate, 16.0));
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  seek(targetMs: number): void {
    this.currentTimeMs = targetMs;
    this.notify();
  }

  advance(deltaMs: number): void {
    this.currentTimeMs += deltaMs;
    this.notify();
  }

  reset(timeMs = 0): void {
    this.currentTimeMs = timeMs;
    this.playing = false;
    this.rate = 1.0;
    this.notify();
  }

  subscribe(listener: ClockListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentTimeMs);
    }
  }
}

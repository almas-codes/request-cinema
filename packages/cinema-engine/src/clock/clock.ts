export type ClockSubscriber = (timeMs: number) => void;

export interface Clock {
  now(): number;
  play(): void;
  pause(): void;
  seek(t: number): void;
  setRate(r: number): void;
  getRate(): number;
  isPlaying(): boolean;
  subscribe(cb: ClockSubscriber): () => void;
}

export class ManualClock implements Clock {
  private t = 0;
  private playing = false;
  private rate = 1.0;
  private readonly subs = new Set<ClockSubscriber>();

  constructor(initialTime = 0) {
    this.t = initialTime;
  }

  now(): number {
    return this.t;
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setRate(r: number): void {
    this.rate = Math.max(-8.0, Math.min(r, 8.0));
  }

  getRate(): number {
    return this.rate;
  }

  seek(t: number): void {
    this.t = t;
    this.emit();
  }

  step(deltaMs: number): void {
    this.t += deltaMs;
    this.emit();
  }

  advance(deltaMs: number): void {
    this.step(deltaMs);
  }

  subscribe(cb: ClockSubscriber): () => void {
    this.subs.add(cb);
    return () => {
      this.subs.delete(cb);
    };
  }

  private emit(): void {
    for (const sub of this.subs) {
      sub(this.t);
    }
  }
}

export class ScrubClock extends ManualClock {
  scrubTo(timeMs: number): void {
    this.seek(timeMs);
  }
}

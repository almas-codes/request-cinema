/**
 * Seeded Mulberry32 pseudo-random number generator.
 * Produces deterministic, reproducible pseudo-random numbers.
 */
export class SeededRng {
  private state: number;
  private readonly initialSeed: number;

  constructor(seed = 42) {
    this.initialSeed = seed;
    this.state = seed | 0;
  }

  /**
   * Generates a floating point number in [0, 1).
   */
  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates an integer in [min, max] inclusive.
   */
  nextInt(min: number, max: number): number {
    if (min >= max) {
      return min;
    }
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates a boolean with given probability of true.
   */
  nextBool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Selects a random element from a non-empty array.
   */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const idx = this.nextInt(0, arr.length - 1);
    const item = arr[idx];
    if (item === undefined) {
      throw new Error('Picked undefined item from array');
    }
    return item;
  }

  /**
   * Resets generator to original or new seed.
   */
  reset(seed = this.initialSeed): void {
    this.state = seed | 0;
  }
}

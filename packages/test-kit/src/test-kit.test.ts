import { describe, expect, it } from 'vitest';
import { ManualClock } from './clock.js';
import {
  fanOutSearchFixture,
  queueConsumerFixture,
  retryStormFixture,
  shopCheckoutFixture,
} from './fixtures.js';
import { generateTrace } from './generator.js';
import { SeededRng } from './rng.js';

describe('test-kit components', () => {
  it('SeededRng produces deterministic values', () => {
    const rng1 = new SeededRng(12345);
    const rng2 = new SeededRng(12345);

    const val1 = [rng1.next(), rng1.nextInt(10, 50), rng1.nextBool()];
    const val2 = [rng2.next(), rng2.nextInt(10, 50), rng2.nextBool()];

    expect(val1).toEqual(val2);

    // Pick from array
    const sample = ['alpha', 'beta', 'gamma'];
    const picked = rng1.pick(sample);
    expect(sample).toContain(picked);

    // Edge cases
    expect(() => rng1.pick([])).toThrow('Cannot pick from empty array');
    expect(rng1.nextInt(5, 5)).toBe(5);
  });

  it('ManualClock manages time and subscribers deterministically', () => {
    const clock = new ManualClock(100);
    expect(clock.now()).toBe(100);
    expect(clock.isPlaying()).toBe(false);

    let recorded = 0;
    const unsub = clock.subscribe((t) => {
      recorded = t;
    });

    clock.advance(50);
    expect(clock.now()).toBe(150);
    expect(recorded).toBe(150);

    clock.play();
    expect(clock.isPlaying()).toBe(true);

    clock.setRate(2.5);
    expect(clock.getRate()).toBe(2.5);

    clock.pause();
    expect(clock.isPlaying()).toBe(false);

    clock.seek(500);
    expect(clock.now()).toBe(500);
    expect(recorded).toBe(500);

    unsub();
    clock.advance(50);
    expect(clock.now()).toBe(550);
    expect(recorded).toBe(500); // Not called after unsubscribe

    clock.reset();
    expect(clock.now()).toBe(0);
    expect(clock.getRate()).toBe(1.0);
  });

  it('generateTrace is strictly reproducible with the same seed', () => {
    const traceA = generateTrace({ seed: 999, spanCount: 15 });
    const traceB = generateTrace({ seed: 999, spanCount: 15 });

    expect(traceA.traceId).toBe(traceB.traceId);
    expect(traceA.spans.length).toBe(traceB.spans.length);
    expect(traceA.spans.map((s) => s.spanId)).toEqual(traceB.spans.map((s) => s.spanId));
    expect(traceA.spans.map((s) => s.startNs)).toEqual(traceB.spans.map((s) => s.startNs));
  });

  it('generateTrace applies skew, orphans, cycles, and negative durations', () => {
    const trace = generateTrace({
      seed: 777,
      spanCount: 12,
      skewMs: 20,
      orphanRate: 0.5,
      cycleRate: 0.5,
      negativeDurationRate: 0.5,
      hugeAttributes: true,
    });

    expect(trace.spans.length).toBeGreaterThan(1);
    expect(trace.spans[0]?.attributes).toHaveProperty('service.version');
  });

  it('loads realistic fixtures', () => {
    const shop = shopCheckoutFixture();
    expect(shop.spans.length).toBe(8);
    expect(shop.rootSpanId).toBe('sp-gateway');

    const search = fanOutSearchFixture();
    expect(search.spans.length).toBe(6);

    const retry = retryStormFixture();
    expect(retry.spans.length).toBe(4);
    expect(retry.spans.filter((s) => s.status === 'error').length).toBe(4);

    const queue = queueConsumerFixture();
    expect(queue.spans.length).toBe(2);
  });
});

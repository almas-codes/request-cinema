import { traceSchema } from '@request-cinema/trace-model';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeTrace } from './normalizer.js';
import type { RawSpan } from './types.js';

describe('OTLP property-based normalization tests', () => {
  const arbitraryRawSpan: fc.Arbitrary<RawSpan> = fc.record({
    traceId: fc.string({ minLength: 1, maxLength: 36 }),
    spanId: fc.string({ minLength: 1, maxLength: 36 }),
    parentSpanId: fc.option(fc.string({ minLength: 1, maxLength: 36 }), { nil: null }),
    name: fc.string({ maxLength: 50 }),
    kind: fc.constantFrom('internal', 'server', 'client', 'producer', 'consumer', 1, 2, 3),
    startTimeUnixNano: fc.oneof(
      fc.bigInt({ min: -100_000n, max: 2_000_000_000_000_000_000n }),
      fc.integer({ min: -100_000, max: 10_000_000 }),
    ),
    endTimeUnixNano: fc.oneof(
      fc.bigInt({ min: -100_000n, max: 2_000_000_000_000_000_000n }),
      fc.integer({ min: -100_000, max: 10_000_000 }),
    ),
    serviceName: fc.string({ maxLength: 30 }),
    attributes: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.oneof(fc.string(), fc.integer(), fc.boolean()),
    ),
  });

  it('any generated arbitrary trace normalizes without throwing and yields a valid Trace', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryRawSpan, { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        (rawSpans, traceId) => {
          const result = normalizeTrace(rawSpans, traceId);

          // Invariant 1: Valid trace schema
          const validation = traceSchema.safeParse(result);
          expect(validation.success).toBe(true);

          // Invariant 2: Result has root span
          expect(result.rootSpanId).not.toBeNull();

          // Invariant 3: All spans have endNs > startNs
          for (const s of result.spans) {
            expect(s.endNs).toBeGreaterThan(s.startNs);
          }

          // Invariant 4: Global trace boundary
          expect(result.endNs).toBeGreaterThanOrEqual(result.startNs);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

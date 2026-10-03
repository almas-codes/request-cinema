import {
  type AttrValue,
  type Span,
  type SpanId,
  type SpanKind,
  type SpanStatus,
  type Trace,
  type TraceId,
  asSpanId,
  asTraceId,
} from '@request-cinema/trace-model';
import fc from 'fast-check';

export const arbitrarySpanId = fc.stringMatching(/^[a-f0-9]{16}$/).map(asSpanId);
export const arbitraryTraceId = fc.stringMatching(/^[a-f0-9]{32}$/).map(asTraceId);

export const arbitraryAttrValue: fc.Arbitrary<AttrValue> = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.array(fc.string(), { maxLength: 5 }),
);

export const arbitrarySpanKind: fc.Arbitrary<SpanKind> = fc.constantFrom(
  'internal',
  'server',
  'client',
  'producer',
  'consumer',
);

export const arbitrarySpanStatus: fc.Arbitrary<SpanStatus> = fc.constantFrom(
  'ok',
  'error',
  'unset',
);

export const arbitrarySpan = (traceId: TraceId): fc.Arbitrary<Span> =>
  fc.record({
    traceId: fc.constant(traceId),
    spanId: arbitrarySpanId,
    parentId: fc.option(arbitrarySpanId, { nil: null }),
    service: fc.constantFrom('api', 'auth', 'payment', 'db', 'cache'),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    kind: arbitrarySpanKind,
    startNs: fc.bigInt({ min: 1_000_000_000n, max: 2_000_000_000_000_000_000n }),
    endNs: fc.bigInt({ min: 1_000_000_000n, max: 2_000_000_000_000_000_000n }),
    status: arbitrarySpanStatus,
    attributes: fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), arbitraryAttrValue),
    events: fc.constant([]),
    links: fc.constant([]),
    repairs: fc.constant([]),
  });

export const arbitraryTrace: fc.Arbitrary<Trace> = arbitraryTraceId.chain((traceId) =>
  fc.array(arbitrarySpan(traceId), { minLength: 1, maxLength: 20 }).map((spans) => {
    let startNs = spans[0]?.startNs ?? 0n;
    let endNs = spans[0]?.endNs ?? 0n;
    for (const s of spans) {
      if (s.startNs < startNs) startNs = s.startNs;
      if (s.endNs > endNs) endNs = s.endNs;
    }
    const root = spans.find((s) => s.parentId === null) ?? spans[0];
    return {
      traceId,
      spans,
      rootSpanId: root ? root.spanId : null,
      startNs,
      endNs,
    };
  }),
);

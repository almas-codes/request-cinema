import { describe, expect, it } from 'vitest';
import { children, criticalPath, durationMs, findSpan, rootSpan, traceSummary } from './helpers.js';
import { asSpanId, asTraceId, spanSchema, traceSchema } from './schemas.js';
import type { Span, Trace } from './types.js';

describe('trace-model schemas and helpers', () => {
  const traceId = asTraceId('trace-101');
  const spanRootId = asSpanId('span-1');
  const spanChild1Id = asSpanId('span-2');
  const spanChild2Id = asSpanId('span-3');

  const rootSpanObj: Span = {
    traceId,
    spanId: spanRootId,
    parentId: null,
    service: 'api-gateway',
    name: 'GET /orders',
    kind: 'server',
    startNs: 1_000_000_000n,
    endNs: 1_200_000_000n,
    status: 'ok',
    attributes: { 'http.status_code': 200 },
    events: [{ name: 'request_received', timeNs: 1_000_500_000n }],
    links: [],
    repairs: [],
  };

  const child1: Span = {
    traceId,
    spanId: spanChild1Id,
    parentId: spanRootId,
    service: 'order-service',
    name: 'FetchOrder',
    kind: 'internal',
    startNs: 1_010_000_000n,
    endNs: 1_100_000_000n, // 90ms
    status: 'ok',
    attributes: {},
    events: [],
    links: [],
    repairs: [],
  };

  const child2: Span = {
    traceId,
    spanId: spanChild2Id,
    parentId: spanRootId,
    service: 'payment-service',
    name: 'VerifyPayment',
    kind: 'client',
    startNs: 1_050_000_000n,
    endNs: 1_190_000_000n, // 140ms (longer child)
    status: 'error',
    attributes: {},
    events: [],
    links: [],
    repairs: [],
  };

  const traceObj: Trace = {
    traceId,
    spans: [rootSpanObj, child1, child2],
    rootSpanId: spanRootId,
    startNs: 1_000_000_000n,
    endNs: 1_200_000_000n,
  };

  it('validates schema correctly', () => {
    const parsedSpan = spanSchema.parse(rootSpanObj);
    expect(parsedSpan.spanId).toBe(spanRootId);

    const parsedTrace = traceSchema.parse(traceObj);
    expect(parsedTrace.spans).toHaveLength(3);
  });

  it('calculates durationMs accurately', () => {
    expect(durationMs({ startNs: 1_000_000_000n, endNs: 1_050_000_000n })).toBe(50);
    expect(durationMs({ startNs: 100n, endNs: 50n })).toBe(0);
    expect(durationMs({ startNs: 100n, endNs: 100n })).toBe(0);
  });

  it('retrieves children and rootSpan', () => {
    expect(children(traceObj, spanRootId)).toHaveLength(2);
    expect(children(traceObj, spanChild1Id)).toHaveLength(0);
    expect(rootSpan(traceObj)?.spanId).toBe(spanRootId);

    const traceWithoutExplicitRoot: Trace = {
      ...traceObj,
      rootSpanId: null,
    };
    expect(rootSpan(traceWithoutExplicitRoot)?.spanId).toBe(spanRootId);

    const emptyTrace: Trace = {
      traceId,
      spans: [],
      rootSpanId: null,
      startNs: 0n,
      endNs: 0n,
    };
    expect(rootSpan(emptyTrace)).toBeNull();
    expect(criticalPath(emptyTrace)).toEqual([]);
  });

  it('finds span by id', () => {
    expect(findSpan(traceObj, spanRootId)).toBe(rootSpanObj);
    expect(findSpan(traceObj, asSpanId('missing'))).toBeUndefined();
  });

  it('computes critical path correctly', () => {
    const cp = criticalPath(traceObj);
    // Root -> child2 is 200 + 140ms path vs child1 90ms
    expect(cp.map((s) => s.spanId)).toEqual([spanRootId, spanChild2Id]);

    // Test trace without root fallback
    const unrootedTrace: Trace = {
      traceId,
      spans: [child1, child2],
      rootSpanId: null,
      startNs: child1.startNs,
      endNs: child2.endNs,
    };
    const cpUnrooted = criticalPath(unrootedTrace);
    expect(cpUnrooted.length).toBe(1);
    expect(cpUnrooted[0]?.spanId).toBe(spanChild1Id);
  });

  it('computes traceSummary', () => {
    const summary = traceSummary(traceObj);
    expect(summary.totalSpans).toBe(3);
    expect(summary.serviceCount).toBe(3);
    expect(summary.errorCount).toBe(1);
    expect(summary.durationMs).toBe(200);
  });
});

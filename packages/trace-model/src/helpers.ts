import type { Span, SpanId, Trace } from './types.js';

/**
 * Calculates duration in milliseconds from startNs and endNs.
 */
export function durationMs(range: { startNs: bigint; endNs: bigint }): number {
  const diffNs = range.endNs - range.startNs;
  if (diffNs <= 0n) {
    return 0;
  }
  return Number(diffNs) / 1_000_000;
}

/**
 * Finds all immediate children of a given parent span (or roots if parent is null).
 */
export function children(trace: Trace, parentSpanId: SpanId | null): Span[] {
  return trace.spans.filter((span) => span.parentId === parentSpanId);
}

/**
 * Returns the designated root span of the trace, or first span without parent, or null.
 */
export function rootSpan(trace: Trace): Span | null {
  if (trace.rootSpanId) {
    const found = trace.spans.find((s) => s.spanId === trace.rootSpanId);
    if (found) {
      return found;
    }
  }
  return trace.spans.find((s) => s.parentId === null) ?? null;
}

/**
 * Looks up a span by its SpanId.
 */
export function findSpan(trace: Trace, spanId: SpanId): Span | undefined {
  return trace.spans.find((s) => s.spanId === spanId);
}

/**
 * Computes the critical path (the longest latency chain of dependent spans from root to leaf).
 */
export function criticalPath(trace: Trace): Span[] {
  if (trace.spans.length === 0) {
    return [];
  }

  const root = rootSpan(trace);
  if (!root) {
    // If no explicit root, pick earliest span
    const sorted = [...trace.spans].sort((a, b) => (a.startNs < b.startNs ? -1 : 1));
    const first = sorted[0];
    return first ? [first] : [];
  }

  // Memoized path length
  const memo = new Map<SpanId, { duration: bigint; path: Span[] }>();

  function computeLongest(span: Span): { duration: bigint; path: Span[] } {
    const cached = memo.get(span.spanId);
    if (cached) {
      return cached;
    }

    const myDuration = span.endNs > span.startNs ? span.endNs - span.startNs : 0n;
    const childSpans = children(trace, span.spanId);

    if (childSpans.length === 0) {
      const res = { duration: myDuration, path: [span] };
      memo.set(span.spanId, res);
      return res;
    }

    let maxChildDuration = -1n;
    let bestChildPath: Span[] = [];

    for (const child of childSpans) {
      const childResult = computeLongest(child);
      if (childResult.duration > maxChildDuration) {
        maxChildDuration = childResult.duration;
        bestChildPath = childResult.path;
      }
    }

    const res = {
      duration: myDuration + (maxChildDuration > 0n ? maxChildDuration : 0n),
      path: [span, ...bestChildPath],
    };
    memo.set(span.spanId, res);
    return res;
  }

  return computeLongest(root).path;
}

export interface TraceSummary {
  serviceCount: number;
  services: string[];
  totalSpans: number;
  errorCount: number;
  durationMs: number;
}

/**
 * Summarizes trace metrics.
 */
export function traceSummary(trace: Trace): TraceSummary {
  const serviceSet = new Set<string>();
  let errorCount = 0;

  for (const span of trace.spans) {
    serviceSet.add(span.service);
    if (span.status === 'error') {
      errorCount += 1;
    }
  }

  return {
    serviceCount: serviceSet.size,
    services: Array.from(serviceSet),
    totalSpans: trace.spans.length,
    errorCount,
    durationMs: durationMs(trace),
  };
}

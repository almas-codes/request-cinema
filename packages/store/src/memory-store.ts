import { type Trace, type TraceId, durationMs } from '@request-cinema/trace-model';
import type { StorageAdapter } from './adapter.js';
import type { DurationStats, StorageHealth, TraceQuery } from './types.js';

export class MemoryStore implements StorageAdapter {
  private traces = new Map<TraceId, Trace>();

  async putTrace(trace: Trace): Promise<void> {
    this.traces.set(trace.traceId, trace);
  }

  async getTrace(traceId: TraceId): Promise<Trace | null> {
    return this.traces.get(traceId) ?? null;
  }

  async listTraces(query: TraceQuery = {}): Promise<{ traces: Trace[]; total: number }> {
    let result = Array.from(this.traces.values());

    if (query.service) {
      const qService = query.service.toLowerCase();
      result = result.filter((t) => t.spans.some((s) => s.service.toLowerCase() === qService));
    }

    if (query.hasError !== undefined) {
      result = result.filter((t) => t.spans.some((s) => s.status === 'error') === query.hasError);
    }

    if (query.minDurationMs !== undefined) {
      result = result.filter((t) => durationMs(t) >= (query.minDurationMs ?? 0));
    }

    if (query.maxDurationMs !== undefined) {
      result = result.filter(
        (t) => durationMs(t) <= (query.maxDurationMs ?? Number.POSITIVE_INFINITY),
      );
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.traceId.toLowerCase().includes(term) ||
          t.spans.some(
            (s) => s.name.toLowerCase().includes(term) || s.service.toLowerCase().includes(term),
          ),
      );
    }

    const total = result.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;

    return {
      traces: result.slice(offset, offset + limit),
      total,
    };
  }

  async durationStats(opKey: string): Promise<DurationStats> {
    const matchingDurations: number[] = [];

    for (const trace of this.traces.values()) {
      for (const span of trace.spans) {
        if (span.name === opKey) {
          matchingDurations.push(durationMs(span));
        }
      }
    }

    if (matchingDurations.length === 0) {
      return { opKey, count: 0, p50: 0, p90: 0, p99: 0, min: 0, max: 0, distribution: [] };
    }

    matchingDurations.sort((a, b) => a - b);
    const count = matchingDurations.length;
    const p50 = matchingDurations[Math.floor(count * 0.5)] ?? 0;
    const p90 = matchingDurations[Math.floor(count * 0.9)] ?? 0;
    const p99 = matchingDurations[Math.floor(count * 0.99)] ?? 0;
    const min = matchingDurations[0] ?? 0;
    const max = matchingDurations[count - 1] ?? 0;

    return {
      opKey,
      count,
      p50,
      p90,
      p99,
      min,
      max,
      distribution: matchingDurations,
    };
  }

  async health(): Promise<StorageHealth> {
    return {
      healthy: true,
      totalTraces: this.traces.size,
    };
  }

  async close(): Promise<void> {
    this.traces.clear();
  }
}

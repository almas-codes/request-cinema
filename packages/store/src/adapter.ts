import type { Trace, TraceId } from '@request-cinema/trace-model';
import type { DurationStats, StorageHealth, TraceQuery } from './types.js';

export interface StorageAdapter {
  putTrace(trace: Trace): Promise<void>;
  getTrace(traceId: TraceId): Promise<Trace | null>;
  listTraces(query?: TraceQuery): Promise<{ traces: Trace[]; total: number }>;
  durationStats(opKey: string): Promise<DurationStats>;
  health(): Promise<StorageHealth>;
  close(): Promise<void>;
}

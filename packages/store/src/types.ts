import type { Trace, TraceId } from '@request-cinema/trace-model';

export interface TraceQuery {
  service?: string | undefined;
  minDurationMs?: number | undefined;
  maxDurationMs?: number | undefined;
  hasError?: boolean | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  search?: string | undefined;
}

export interface DurationStats {
  opKey: string;
  count: number;
  p50: number;
  p90: number;
  p99: number;
  min: number;
  max: number;
  distribution: number[];
}

export interface StorageHealth {
  healthy: boolean;
  totalTraces: number;
  message?: string | undefined;
}

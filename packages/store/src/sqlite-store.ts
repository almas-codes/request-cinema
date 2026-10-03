import { DatabaseSync } from 'node:sqlite';
import { type Trace, type TraceId, asTraceId, durationMs } from '@request-cinema/trace-model';
import type { StorageAdapter } from './adapter.js';
import type { DurationStats, StorageHealth, TraceQuery } from './types.js';

function serializeTrace(trace: Trace): string {
  return JSON.stringify(trace, (_, v) => (typeof v === 'bigint' ? `${v.toString()}n` : v));
}

function deserializeTrace(json: string): Trace {
  return JSON.parse(json, (_, v) => {
    if (typeof v === 'string' && /^-?\d+n$/.test(v)) {
      return BigInt(v.slice(0, -1));
    }
    return v;
  }) as Trace;
}

export class SqliteStore implements StorageAdapter {
  private db: DatabaseSync;

  constructor(dbPath = ':memory:') {
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS traces (
        trace_id TEXT PRIMARY KEY,
        json_data TEXT NOT NULL,
        start_ns TEXT NOT NULL,
        end_ns TEXT NOT NULL,
        duration_ms REAL NOT NULL,
        has_error INTEGER NOT NULL,
        service TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_traces_service ON traces(service);
      CREATE INDEX IF NOT EXISTS idx_traces_duration ON traces(duration_ms);
      CREATE INDEX IF NOT EXISTS idx_traces_error ON traces(has_error);
    `);
  }

  async putTrace(trace: Trace): Promise<void> {
    const durMs = durationMs(trace);
    const hasError = trace.spans.some((s) => s.status === 'error') ? 1 : 0;
    const rootService =
      trace.spans.find((s) => s.parentId === null)?.service ?? trace.spans[0]?.service ?? 'unknown';
    const jsonStr = serializeTrace(trace);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO traces (trace_id, json_data, start_ns, end_ns, duration_ms, has_error, service)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      trace.traceId,
      jsonStr,
      trace.startNs.toString(),
      trace.endNs.toString(),
      durMs,
      hasError,
      rootService,
    );
  }

  async getTrace(traceId: TraceId): Promise<Trace | null> {
    const stmt = this.db.prepare('SELECT json_data FROM traces WHERE trace_id = ?');
    const row = stmt.get(traceId) as { json_data: string } | undefined;
    if (!row) return null;
    return deserializeTrace(row.json_data);
  }

  async listTraces(query: TraceQuery = {}): Promise<{ traces: Trace[]; total: number }> {
    let whereClause = '1=1';
    const params: Array<string | number> = [];

    if (query.service) {
      whereClause += ' AND service = ?';
      params.push(query.service);
    }

    if (query.hasError !== undefined) {
      whereClause += ' AND has_error = ?';
      params.push(query.hasError ? 1 : 0);
    }

    if (query.minDurationMs !== undefined) {
      whereClause += ' AND duration_ms >= ?';
      params.push(query.minDurationMs);
    }

    if (query.maxDurationMs !== undefined) {
      whereClause += ' AND duration_ms <= ?';
      params.push(query.maxDurationMs);
    }

    if (query.search) {
      whereClause += ' AND (trace_id LIKE ? OR service LIKE ?)';
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM traces WHERE ${whereClause}`);
    const countRow = countStmt.get(...params) as { count: number };
    const total = countRow.count;

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const selectStmt = this.db.prepare(`
      SELECT json_data FROM traces WHERE ${whereClause}
      ORDER BY duration_ms DESC
      LIMIT ? OFFSET ?
    `);

    const rows = selectStmt.all(...params, limit, offset) as Array<{ json_data: string }>;
    const traces = rows.map((r) => deserializeTrace(r.json_data));

    return { traces, total };
  }

  async durationStats(opKey: string): Promise<DurationStats> {
    const selectStmt = this.db.prepare('SELECT json_data FROM traces');
    const rows = selectStmt.all() as Array<{ json_data: string }>;
    const matching: number[] = [];

    for (const r of rows) {
      const trace = deserializeTrace(r.json_data);
      for (const span of trace.spans) {
        if (span.name === opKey) {
          matching.push(durationMs(span));
        }
      }
    }

    if (matching.length === 0) {
      return { opKey, count: 0, p50: 0, p90: 0, p99: 0, min: 0, max: 0, distribution: [] };
    }

    matching.sort((a, b) => a - b);
    const count = matching.length;
    return {
      opKey,
      count,
      p50: matching[Math.floor(count * 0.5)] ?? 0,
      p90: matching[Math.floor(count * 0.9)] ?? 0,
      p99: matching[Math.floor(count * 0.99)] ?? 0,
      min: matching[0] ?? 0,
      max: matching[count - 1] ?? 0,
      distribution: matching,
    };
  }

  async health(): Promise<StorageHealth> {
    try {
      const row = this.db.prepare('SELECT COUNT(*) as c FROM traces').get() as { c: number };
      return { healthy: true, totalTraces: row.c };
    } catch (err) {
      return { healthy: false, totalTraces: 0, message: String(err) };
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

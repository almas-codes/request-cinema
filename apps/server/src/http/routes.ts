import { buildSceneGraph, layoutMetroGraph } from '@request-cinema/cinema-engine';
import { decodeOtlpJson, normalizeTrace } from '@request-cinema/otlp';
import { GitService, resolveSpanToCode } from '@request-cinema/source-resolver';
import type { StorageAdapter } from '@request-cinema/store';
import { type Trace, asSpanId, asTraceId } from '@request-cinema/trace-model';
import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import type { StatusCode } from 'hono/utils/http-status';
import type { EnvConfig } from '../config/env.js';
import type { IngestionPipeline } from '../pipeline/queue.js';

export function createRouter(
  config: EnvConfig,
  store: StorageAdapter,
  pipeline: IngestionPipeline,
): Hono {
  const app = new Hono();
  const gitService = new GitService(config.SOURCE_ROOT);

  // Active SSE Clients
  const sseSubscribers = new Set<(trace: Trace) => void>();

  // CORS middleware
  app.use('*', cors({ origin: config.CORS_ORIGIN }));

  // Ingest OTLP Traces (HTTP POST)
  app.post('/v1/traces', async (c) => {
    try {
      const rawText = await c.req.text();
      const { rawSpans, traceIds } = decodeOtlpJson(rawText);

      const tracesByTraceId = new Map<string, typeof rawSpans>();
      for (const sp of rawSpans) {
        if (!tracesByTraceId.has(sp.traceId)) {
          tracesByTraceId.set(sp.traceId, []);
        }
        tracesByTraceId.get(sp.traceId)?.push(sp);
      }

      for (const [tId, spans] of tracesByTraceId.entries()) {
        const trace = normalizeTrace(spans, tId);
        pipeline.enqueue(trace);

        // Notify active SSE clients
        for (const send of sseSubscribers) {
          send(trace);
        }
      }

      return c.json({ status: 'ok', ingested: rawSpans.length });
    } catch (err) {
      return c.json({ error: String(err) }, 400);
    }
  });

  function jsonWithBigInt(c: Context, data: unknown, status: StatusCode = 200) {
    const jsonStr = JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
    return c.newResponse(jsonStr, status, { 'Content-Type': 'application/json' });
  }

  // Query Traces
  app.get('/api/traces', async (c) => {
    const service = c.req.query('service');
    const hasError = c.req.query('error') ? c.req.query('error') === 'true' : undefined;
    const minDur = c.req.query('minDuration') ? Number(c.req.query('minDuration')) : undefined;
    const search = c.req.query('q');
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 50;
    const offset = c.req.query('offset') ? Number(c.req.query('offset')) : 0;

    const result = await store.listTraces({
      service,
      hasError,
      minDurationMs: minDur,
      search,
      limit,
      offset,
    });
    return jsonWithBigInt(c, result);
  });

  // Get Single Trace
  app.get('/api/traces/:id', async (c) => {
    const id = asTraceId(c.req.param('id'));
    const trace = await store.getTrace(id);
    if (!trace) {
      return c.json({ error: 'Trace not found' }, 404);
    }
    return jsonWithBigInt(c, trace);
  });

  // Get Metro Architecture Graph for Active System
  app.get('/api/graph', async (c) => {
    const { traces } = await store.listTraces({ limit: 100 });
    const graph = buildSceneGraph(traces);
    const layout = layoutMetroGraph(graph);
    return c.json(layout);
  });

  // Duration Percentile Statistics for an Operation
  app.get('/api/stats/:opKey', async (c) => {
    const opKey = decodeURIComponent(c.req.param('opKey'));
    const stats = await store.durationStats(opKey);
    return c.json(stats);
  });

  // Resolve Source Code Location for a Span
  app.post('/api/source', async (c) => {
    const span = await c.req.json();
    const location = resolveSpanToCode(span, { sourceRoots: [config.SOURCE_ROOT] });
    return c.json(location);
  });

  // Git History & Blame
  app.get('/api/history', async (c) => {
    const file = c.req.query('file');
    const line = c.req.query('line') ? Number(c.req.query('line')) : undefined;

    if (!file) {
      return c.json({ error: 'Missing file parameter' }, 400);
    }

    const log = await gitService.getFileLog(file);
    const blame = line ? await gitService.getLineBlame(file, line) : null;

    return c.json({ file, log, blame });
  });

  // Live Mode: SSE Stream
  app.get('/api/stream', (c) => {
    return streamSSE(c, async (stream) => {
      const listener = (trace: Trace) => {
        stream.writeSSE({
          data: JSON.stringify(trace, (_, v) => (typeof v === 'bigint' ? `${v.toString()}n` : v)),
          event: 'trace',
        });
      };

      sseSubscribers.add(listener);

      stream.onAbort(() => {
        sseSubscribers.delete(listener);
      });

      // Keepalive ping
      while (!stream.aborted) {
        await stream.sleep(15000);
        await stream.writeSSE({ data: 'ping', event: 'keepalive' });
      }
    });
  });

  // Health and Readiness
  app.get('/healthz', (c) => c.json({ status: 'ok', uptime: process.uptime() }));
  app.get('/readyz', async (c) => {
    const health = await store.health();
    return c.json(health, health.healthy ? 200 : 503);
  });

  // Prometheus Metrics
  app.get('/metrics', (c) => {
    const pipelineMetrics = pipeline.getMetrics();
    const metricsText = [
      '# HELP request_cinema_ingested_traces_total Total ingested traces',
      '# TYPE request_cinema_ingested_traces_total counter',
      `request_cinema_ingested_traces_total ${pipelineMetrics.ingestedTraces}`,
      '# HELP request_cinema_dropped_traces_total Total dropped traces due to queue backpressure',
      '# TYPE request_cinema_dropped_traces_total counter',
      `request_cinema_dropped_traces_total ${pipelineMetrics.droppedTraces}`,
      '# HELP request_cinema_sse_subscribers Active SSE clients',
      '# TYPE request_cinema_sse_subscribers gauge',
      `request_cinema_sse_subscribers ${sseSubscribers.size}`,
    ].join('\n');

    return c.text(metricsText, 200, { 'Content-Type': 'text/plain; version=0.0.4' });
  });

  return app;
}

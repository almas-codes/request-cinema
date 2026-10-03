import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MemoryStore } from '@request-cinema/store';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config/env.js';
import { createRouter } from './http/routes.js';
import { IngestionPipeline } from './pipeline/queue.js';

describe('apps/server Hono API', () => {
  const config = loadConfig({ STORAGE_TYPE: 'memory' });
  const store = new MemoryStore();
  const pipeline = new IngestionPipeline(store);
  const app = createRouter(config, store, pipeline);

  it('GET /healthz returns ok status and uptime', async () => {
    const res = await app.request('/healthz');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  it('GET /readyz returns healthy storage status', async () => {
    const res = await app.request('/readyz');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { healthy: boolean };
    expect(body.healthy).toBe(true);
  });

  it('POST /v1/traces ingests OTLP payload and makes it queryable', async () => {
    function getFixturePath(name: string): string {
      const candidates = [
        resolve(process.cwd(), `examples/trace-fixtures/${name}`),
        resolve(process.cwd(), `../../examples/trace-fixtures/${name}`),
      ];
      for (const c of candidates) {
        try {
          if (readFileSync(c)) return c;
        } catch {}
      }
      throw new Error(`Fixture ${name} not found`);
    }

    const payload = readFileSync(getFixturePath('node-express-otlp.json'), 'utf8');

    const ingestRes = await app.request('/v1/traces', {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
    });

    expect(ingestRes.status).toBe(200);
    const ingestBody = (await ingestRes.json()) as { status: string; ingested: number };
    expect(ingestBody.status).toBe('ok');
    expect(ingestBody.ingested).toBeGreaterThan(0);

    // Wait for pipeline drain
    await pipeline.drainAndShutdown();

    // Query trace
    const listRes = await app.request('/api/traces');
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { total: number; traces: unknown[] };
    expect(listBody.total).toBeGreaterThan(0);

    // Architecture map
    const graphRes = await app.request('/api/graph');
    expect(graphRes.status).toBe(200);
    const graphBody = (await graphRes.json()) as { nodes: unknown[]; edges: unknown[] };
    expect(graphBody.nodes.length).toBeGreaterThan(0);

    // Metrics endpoint
    const metricsRes = await app.request('/metrics');
    expect(metricsRes.status).toBe(200);
    const metricsText = await metricsRes.text();
    expect(metricsText).toContain('request_cinema_ingested_traces_total');
  });
});

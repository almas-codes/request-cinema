import { shopCheckoutFixture } from '@request-cinema/test-kit';
import { asTraceId } from '@request-cinema/trace-model';
import { describe, expect, it } from 'vitest';
import type { StorageAdapter } from './adapter.js';
import { MemoryStore } from './memory-store.js';
import { SqliteStore } from './sqlite-store.js';

describe.each([
  { name: 'MemoryStore', create: () => new MemoryStore() },
  { name: 'SqliteStore', create: () => new SqliteStore(':memory:') },
])('StorageAdapter Contract Test: $name', ({ create }) => {
  const fixture = shopCheckoutFixture();

  it('puts, gets, and persists a trace intact', async () => {
    const store: StorageAdapter = create();
    await store.putTrace(fixture);

    const retrieved = await store.getTrace(fixture.traceId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.traceId).toBe(fixture.traceId);
    expect(retrieved?.spans.length).toBe(fixture.spans.length);
    expect(retrieved?.startNs).toBe(fixture.startNs);

    const nonExistent = await store.getTrace(asTraceId('missing'));
    expect(nonExistent).toBeNull();
    await store.close();
  });

  it('lists traces with filtering and search', async () => {
    const store: StorageAdapter = create();
    await store.putTrace(fixture);

    // List all
    const all = await store.listTraces();
    expect(all.total).toBe(1);
    expect(all.traces.length).toBe(1);

    // Filter by matching service
    const matching = await store.listTraces({ service: 'api-gateway' });
    expect(matching.total).toBe(1);

    // Filter by non-matching service
    const nonMatching = await store.listTraces({ service: 'non-existent' });
    expect(nonMatching.total).toBe(0);

    // Search query
    const searched = await store.listTraces({ search: 'checkout' });
    expect(searched.total).toBe(1);

    await store.close();
  });

  it('calculates duration stats and percentiles for operations', async () => {
    const store: StorageAdapter = create();
    await store.putTrace(fixture);

    const stats = await store.durationStats('POST /v1/checkout');
    expect(stats.count).toBe(1);
    expect(stats.p50).toBe(250);

    const emptyStats = await store.durationStats('missing-op');
    expect(emptyStats.count).toBe(0);

    const health = await store.health();
    expect(health.healthy).toBe(true);
    expect(health.totalTraces).toBe(1);

    await store.close();
  });
});

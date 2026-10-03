import { serve } from '@hono/node-server';
import { MemoryStore, SqliteStore, type StorageAdapter } from '@request-cinema/store';
import { loadConfig } from './config/env.js';
import { createRouter } from './http/routes.js';
import { IngestionPipeline } from './pipeline/queue.js';

export function startServer() {
  const config = loadConfig();
  const store: StorageAdapter =
    config.STORAGE_TYPE === 'sqlite' ? new SqliteStore(config.SQLITE_PATH) : new MemoryStore();
  const pipeline = new IngestionPipeline(store);
  const app = createRouter(config, store, pipeline);

  const server = serve(
    {
      fetch: app.fetch,
      port: config.PORT,
    },
    (info) => {
      console.log(`🎬 Request Cinema Server running at http://localhost:${info.port}`);
      console.log(`📡 OTLP Ingest: POST http://localhost:${info.port}/v1/traces`);
    },
  );

  const shutdown = async () => {
    console.log('\nGracefully shutting down Request Cinema...');
    await pipeline.drainAndShutdown();
    await store.close();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { app, server, store, pipeline };
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

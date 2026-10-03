# ADR 0004: SQLite with WAL Mode as Default Persistence

## Status
Accepted

## Context
Trace collectors frequently suffer from complex storage requirements (e.g. running external Elasticsearch or Cassandra clusters). For local development, single-binary deploys, and embedded edge collectors, we need zero-setup persistence with high concurrent write throughput.

## Decision
Adopt SQLite with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and synchronous normal mode as the default storage adapter. Provide an in-memory adapter (`MemoryStore`) for browser-only demos.

## Consequences
- Single-command zero-config startup (`pnpm dev`, `docker compose up`).
- Concurrent reads and writes without thread locking.
- Fast percentile calculation and indexed query filters.

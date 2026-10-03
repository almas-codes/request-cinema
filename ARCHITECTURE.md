# Request Cinema: Architecture Documentation

## Overview
Request Cinema animates OpenTelemetry distributed traces as moving trains along an automatically generated metro transit map of your distributed architecture.

## Monorepo Layout & Package Boundaries

```
request-cinema/
├── apps/
│   ├── web/               # React 19 + Vite SPA (Inspector, Map, Traces, Player)
│   ├── server/            # Hono backend (OTLP Ingestion, REST, SSE, Metrics)
│   └── docs/              # Astro Starlight documentation
└── packages/
    ├── trace-model/       # Leaf-level pure types, Zod schemas, branded identifiers
    ├── otlp/              # JSON/Protobuf decoding, clock-skew repair, PII redaction
    ├── cinema-engine/     # Pure deterministic core ((trace, layout, t) => SceneState)
    ├── cinema-renderer-pixi/ # PixiJS hardware-accelerated WebGL / Canvas renderer
    ├── cinema-react/      # <RequestCinema /> component and hooks
    ├── store/             # Storage adapters: SQLite (WAL mode) and in-memory
    ├── source-resolver/   # ts-morph AST analyzer + simple-git blame & history
    ├── sdk-node/          # Zero-config OpenTelemetry instrumentation helper
    ├── test-kit/          # Seeded generator, fake clocks, realistic fixtures
    └── config/            # Shared tsconfig presets, biome, vitest
```

## Architectural Invariants

1. **Pure Engine Isolation**:
   `packages/cinema-engine` contains zero DOM, zero network, zero React, and zero non-deterministic APIs (`Date.now()` or `Math.random()`). All time is passed via an injected `Clock` interface, and all randomness comes from a seeded Pseudo-Random Number Generator.

2. **Deterministic Timeline Function**:
   Given identical trace, graph layout, and time offset `t`, the timeline calculation:
   $$\text{timeline}(\text{trace}, \text{layout}, t) \to \text{SceneState}$$
   produces bit-for-bit identical keyframes and train states.

3. **Boundary Validation with Zod**:
   Every boundary (OTLP payloads, HTTP queries, database rows, configuration variables) is validated with runtime Zod schemas. TypeScript types are derived from schemas via `z.infer`.

4. **Redaction Prior to Storage**:
   OTLP spans are stripped of sensitive values (emails, credit cards, authentication tokens) before any disk persistence or broadcast over SSE.

5. **Storage Adapter Pattern**:
   Persistence implements the `StorageAdapter` interface:
   - `MemoryStore`: In-browser client-only operation and sub-millisecond testing.
   - `SqliteStore`: Node.js persistent store leveraging WAL mode and percentile tracking.

# ADR 0001: Monorepo Setup and Tooling Selection

## Status
Accepted

## Context
Request Cinema requires an architecture consisting of pure computation packages (`cinema-engine`, `trace-model`, `otlp`), a WebGL/Canvas renderer (`cinema-renderer-pixi`), an ecosystem React wrapper (`cinema-react`), storage adapters (`store`), developer tooling (`sdk-node`, `test-kit`), an interactive SPA web application (`apps/web`), an OTLP ingest and API server (`apps/server`), and documentation (`apps/docs`).

To guarantee fast builds, zero-cycle dependency discipline, reproducible developer onboarding, and seamless cross-platform execution (Windows, Linux, macOS), we require a performant monorepo manager and strict boundary validation.

## Decision
1. **Monorepo Manager**: Use `pnpm` workspaces for strict node_modules isolation and symlinking, combined with Turborepo (`turbo`) for pipeline execution and intelligent caching.
2. **Linter & Formatter**: Use Biome for high-performance sub-millisecond linting and formatting, supplemented with `dependency-cruiser` to enforce strict architectural layer isolation.
3. **Type System**: Strict TypeScript with Project References. Root `tsconfig.json` references individual package configs (`tsconfig.library.json`, `tsconfig.node.json`, `tsconfig.react.json`).
4. **Testing**: Vitest with monorepo workspace support (`vitest.workspace.ts`) and `fast-check` for property-based normalization testing.

## Consequences
- Clean separation between pure engine logic and platform-specific runtime code.
- Boundary enforcement blocks forbidden cross-package imports at lint time.
- Predictable and rapid `pnpm install`, `pnpm build`, and `pnpm test` runs across all platforms.

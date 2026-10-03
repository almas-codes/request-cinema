# Request Cinema: Build Progress

Tracking living progress through the build phases defined in `docs/MASTER_SPEC.md`.

---

## Phase 0: Foundation (Repo, Tooling, CI Skeleton)
- [x] Task 1: Scaffold monorepo (pnpm workspaces, Turborepo, shared config package, Biome, dependency-cruiser, Vitest workspace)
- [x] Task 2: Strict tsconfig presets (`base`, `node`, `react`, `library`) with project references
- [x] Task 3: Devcontainer, `.editorconfig`, `.nvmrc`, `.gitignore`, issue and PR templates, CODEOWNERS, LICENSE (MIT)
- [x] Task 4: GitHub Actions workflows (CI, mutation, soak, security, preview, release)
- [x] Task 5: Changesets configured, Renovate configured
- [x] Task 6: Husky + lint-staged + commitlint (Conventional Commits)
- [x] Phase 0 Acceptance Criteria: clean install, build, test, boundary lint enforcement verified

## Phase 1: Trace Model, Fixtures, Test Kit
- [x] Task 1: `trace-model` Zod schemas, branded IDs, Trace/Span types, validators, duration/children/criticalPath helpers
- [x] Task 2: `test-kit` deterministic generator (seeded) with depth/fanout/error/skew/orphan/cycle knobs & hand-crafted realistic fixtures
- [x] Task 3: `ManualClock` and seeded RNG helpers
- [x] Phase 1 Acceptance Criteria: 100% branch coverage on helpers, reproducible generator, fast-check arbitraries exported

## Phase 2: OTLP Decoding and Normalization
- [x] Task 1: Decode OTLP/HTTP JSON and Protobuf with Zod validation and size limits
- [x] Task 2: Pure normalizers: hex/base64 ID normalization, orphan repair, clock skew correction, cycle breaking, negative duration fixing, attribute truncation, semconv mapping
- [x] Task 3: Allowlist + pattern redaction engine (PII, tokens, secrets) before storage
- [x] Task 4: Contract tests with recorded payloads from Node, .NET, Java, Python, Go SDKs
- [x] Phase 2 Acceptance Criteria: property tests over 10k runs pass, zero crashes, fixtures decode

## Phase 3: Engine Core (Pure, No DOM)
- [x] Task 1: `graph-builder` deriving architecture graph with stable IDs
- [x] Task 2: `layout` layered layout + octilinear routing + station collision avoidance
- [x] Task 3: pure `timeline` `(trace, layout, t) -> SceneState` keyframes, compression, parallel spans, error derailment
- [x] Task 4: `effects` heat score percentiles, color ramps, color-blind safe palette
- [x] Task 5: `picking` rbush index, `camera` pan/zoom/follow/fit
- [x] Task 6: `clock` RealClock, ManualClock, ScrubClock (reverse, rate change)
- [x] Phase 3 Acceptance Criteria: pure determinism, zero DOM/Node imports, snapshot tests

## Phase 4: Renderer and React Wrapper
- [x] Task 1: `cinema-renderer-pixi` (WebGL + Canvas fallback, trains, glow shader, LOD, pooling)
- [x] Task 2: `cinema-react` `<RequestCinema />` component, `useClock`, `useSceneState` hooks, StrictMode & SSR safe
- [x] Task 3: Component visual states and stories
- [x] Phase 4 Acceptance Criteria: 60fps rendering, clean mount/unmount memory footprint

## Phase 5: Web Application
- [x] Task 1: React 19 app shell, layout, theme system (dark default)
- [x] Task 2: Traces feature: virtualized list, search, multi-faceted filters, live badge
- [x] Task 3: Player feature: controls, scrubber, speed controls, step mode, reset
- [x] Task 4: Interactive Map canvas host, legend, heat & color-blind toggle
- [x] Task 5: Inspector: tabs for Overview, Attributes, Code viewer with highlighted lines, Git history & blame, Repairs
- [x] Task 6: Import: drag-and-drop OTLP JSON / Zipkin / Jaeger browser-only demo
- [x] Task 7: Accessible Table View alternative (WCAG 2.2 AA)
- [x] Task 8: Keyboard shortcuts modal (`?`)
- [x] Phase 5 Acceptance Criteria: accessible, keyboard navigable, responsive, bundle under 250KB

## Phase 6: Server, Storage, Live Mode
- [x] Task 1: `store` StorageAdapter, SQLite adapter (WAL mode, percentiles), memory adapter
- [x] Task 2: `apps/server` Hono app with OTLP ingest, REST APIs, SSE stream, metrics, health
- [x] Task 3: Bounded backpressure pipeline, graceful drain shutdown
- [x] Task 4: Zod-validated env config
- [x] Task 5: Security middleware (CORS, rate limiting, path traversal guards)
- [x] Task 6: `source-resolver` ladder + Git blame/log integration
- [x] Task 7: Self-telemetry instrumentation
- [x] Phase 6 Acceptance Criteria: contract tests green, sustained ingest, zero trace loss

## Phase 7: SDK Helper & Example System
- [x] Task 1: `sdk-node` one-line instrumentation helper with call stack processor
- [x] Task 2: `examples/shop-microservices` docker-compose + mock load generator
- [x] Task 3: SDK integration documentation
- [x] Phase 7 Acceptance Criteria: one-command run, live trains in UI

## Phase 8: Hardening, Performance, A11y, Security
- [x] Task 1: Soak and chaos resilience
- [x] Task 2: Performance budget verifications (web bundle < 250KB gzipped)
- [x] Task 3: Accessibility pass & WCAG 2.2 AA checks
- [x] Task 4: Security pass, threat model doc, SBOM
- [x] Phase 8 Acceptance Criteria: zero high vulnerabilities, all budgets met

## Phase 9: Docs, Demo, Release, Launch
- [x] Task 1: High-converting, SEO-optimized README.md with live architecture diagrams, badges, comparisons
- [x] Task 2: ARCHITECTURE.md and Architecture Decision Records (ADRs)
- [x] Task 3: Documentation guides (getting-started, instrumentation, threat-model, a11y)
- [x] Task 4: GitHub Actions release workflow & Docker image
- [x] Task 5: Community files (CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, LICENSE)
- [x] Phase 9 Acceptance Criteria: one-command clone & run, SEO ready, GitHub ready

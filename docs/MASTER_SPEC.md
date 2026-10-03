# REQUEST CINEMA: MASTER BUILD SPEC FOR CURSOR

> Paste this whole file into Cursor as the first message, or save it as `docs/MASTER_SPEC.md` and add `.cursor/rules/project.mdc` (section 15). Work **one phase at a time**. After each task: run typecheck, lint, tests, then commit with a Conventional Commit message. Never skip ahead.

---

## 0. ROLE

You are a senior staff engineer building **Request Cinema**, a production-grade open-source tool that animates distributed OpenTelemetry traces as trains moving along a metro-style map of the real architecture. Slow spans glow red. Clicking any node opens the source code and git history of that code.

The repo must impress anyone who opens it: clean architecture, excellent tests, a stunning demo, great docs, and a reliable release pipeline.

## 1. PRODUCT SCOPE

### Must have
1. Ingest OTLP traces (HTTP, protobuf and JSON) from any OpenTelemetry SDK.
2. Normalize traces: repair orphans, fix clock skew, handle cycles and negative durations.
3. Build an architecture map automatically from traces (services, modules, datastores, queues) with metro-style layout.
4. Animate a trace: one "train" per span travels along edges for its real (time-scaled) duration.
5. Heat coloring from duration percentiles vs. history for that operation (relative, not hardcoded).
6. Player: play, pause, scrub (forward and backward), speed 0.25x to 8x, follow-request camera, step mode.
7. Inspector: span details, attributes (redacted), events, errors, linked source code, git blame and history.
8. Trace list with search and filters (service, duration, error, time range, attribute).
9. Live mode: new traces stream in via SSE.
10. Drag-and-drop trace file demo that runs fully in the browser (no server).
11. Dogfooding: the server emits its own traces viewable in itself.
12. Publishable packages: engine, react component, SDK helper.

### Non-goals (do not build)
Metrics and logs ingestion, multi-tenant auth, alerting, a hosted SaaS, mobile apps.

## 2. NON-NEGOTIABLE RULES

**Architecture**
- pnpm workspaces + Turborepo monorepo. TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. ESM only.
- `packages/cinema-engine` is **pure**: no React, no DOM, no network, no `Date.now()`, no `Math.random()`. Time comes from an injected `Clock`. Randomness from a seeded RNG.
- `timeline(trace, layout, t) -> SceneState` is a pure deterministic function. Same input, same frame.
- Rendering sits behind a `Renderer` interface. PixiJS is one implementation.
- Layout (elkjs) runs in a Web Worker. Never block the main thread for more than 16ms.
- Every boundary (HTTP in, OTLP payloads, DB rows, env vars, file uploads) is validated with Zod. Types are derived from schemas.
- Server state: TanStack Query. UI-only state: Zustand. No other global state.
- Storage is an adapter interface (`sqlite` default, `duckdb` optional, `memory` for tests and browser).
- Each package exposes its public API only through `index.ts`. No deep imports across packages (enforced by lint rule).

**Code quality**
- No `any`, no `!` non-null assertions, no default exports (except route files), no barrel files inside feature folders.
- Files under 250 lines. Functions small and named for intent. No clever code.
- Errors are typed (`Result<T, E>` style in core packages). No silent catches.
- Write the test first for logic in `trace-model`, `otlp`, `timeline`, `layout`.
- Every normalization function gets a fast-check property test.

**Process**
- Before each task: restate it and list files you will touch.
- Never invent library APIs. Check installed package types or docs first.
- Pin latest stable versions at scaffold time (`pnpm dlx taze -w`). Do not trust remembered version numbers.
- If something is ambiguous, ask one specific question instead of guessing.

## 3. TECH STACK

| Concern | Choice |
|---|---|
| Language | TypeScript strict, Node 22 LTS or newer |
| Monorepo | pnpm workspaces, Turborepo (remote cache optional) |
| Frontend | React 19, Vite, TanStack Router, TanStack Query |
| UI state | Zustand |
| Styling | Tailwind CSS, Radix UI primitives, `class-variance-authority`, lucide-react |
| Rendering | PixiJS (WebGL) with Canvas fallback |
| Layout | elkjs in a Web Worker (via Comlink) |
| Spatial index | rbush |
| Backend | Hono on Node (`@hono/node-server`), runtime-portable |
| Validation | Zod |
| OTLP | `@opentelemetry/otlp-transformer` types, protobuf decode via `protobufjs` |
| Storage | better-sqlite3 (default), DuckDB (optional adapter), in-memory |
| Source analysis | ts-morph (TS/JS), web-tree-sitter (other languages) |
| Git | simple-git |
| Lint/format | Biome, plus `dependency-cruiser` for boundary rules |
| Unit/integration | Vitest |
| Property tests | fast-check |
| Mutation tests | Stryker (engine, otlp, trace-model) |
| Component tests | Storybook + Vitest browser mode |
| E2E | Playwright (Chromium, Firefox, WebKit) |
| Containers in tests | Testcontainers |
| Load tests | k6 |
| Docs | Astro Starlight |
| Release | Changesets, npm provenance, GHCR Docker image |
| Security | CodeQL, Renovate, Trivy, OSSF Scorecard, `pnpm audit` |
| Telemetry (dogfood) | `@opentelemetry/sdk-node` |

## 4. REPOSITORY STRUCTURE

```
request-cinema/
├─ apps/
│  ├─ web/                          # React 19 + Vite SPA
│  │  ├─ src/
│  │  │  ├─ app/                    # router, providers, error boundaries, theme
│  │  │  ├─ features/
│  │  │  │  ├─ player/              # controls, timeline scrubber, shortcuts
│  │  │  │  ├─ map/                 # canvas host, node/edge interaction
│  │  │  │  ├─ inspector/           # span panel, code viewer, git history
│  │  │  │  ├─ traces/              # list, search, filters, live badge
│  │  │  │  ├─ import/              # drag-and-drop file loader (browser-only mode)
│  │  │  │  ├─ table-view/          # accessible text alternative to the map
│  │  │  │  └─ settings/            # theme, reduced motion, keyboard map
│  │  │  ├─ shared/                 # ui kit, hooks, utils
│  │  │  └─ main.tsx
│  │  ├─ e2e/                       # Playwright specs
│  │  └─ .storybook/
│  ├─ server/                       # Hono app
│  │  └─ src/
│  │     ├─ config/                 # Zod env schema
│  │     ├─ http/                   # routes, middleware, SSE, error mapping
│  │     ├─ ingest/                 # OTLP/HTTP receiver (protobuf + JSON, gzip)
│  │     ├─ pipeline/               # normalize -> redact -> enrich -> persist
│  │     ├─ telemetry/              # self-instrumentation (dogfood)
│  │     └─ main.ts
│  └─ docs/                         # Astro Starlight
│
├─ packages/
│  ├─ trace-model/                  # Zod schemas, normalized Trace/Span types (pure)
│  ├─ otlp/                         # decode, skew fix, orphan repair, cycle break
│  ├─ cinema-engine/                # pure core
│  │  └─ src/
│  │     ├─ model/                  # SceneGraph: nodes, edges, trains
│  │     ├─ graph-builder/          # traces -> architecture graph
│  │     ├─ layout/                 # ELK worker + octilinear routing
│  │     ├─ timeline/               # span -> keyframes, pure
│  │     ├─ clock/                  # Clock, ManualClock, ScrubClock, RealClock
│  │     ├─ effects/                # heat from percentiles, error pulses
│  │     ├─ picking/                # hit testing with rbush
│  │     ├─ camera/                 # pan, zoom, follow
│  │     ├─ rng/                    # seeded RNG
│  │     ├─ renderer.ts             # Renderer interface
│  │     └─ index.ts
│  ├─ cinema-renderer-pixi/         # Pixi implementation of Renderer
│  ├─ cinema-react/                 # <RequestCinema /> wrapper + hooks
│  ├─ source-resolver/              # file, symbol, blame, history
│  ├─ store/                        # StorageAdapter + sqlite, duckdb, memory
│  ├─ sdk-node/                     # one-line instrumentation helper
│  ├─ test-kit/                     # fixtures, generators, fake clock, OTLP samplers
│  └─ config/                       # shared tsconfig, biome, vitest, tailwind presets
│
├─ examples/
│  ├─ shop-microservices/           # docker-compose: Node API, .NET service, Postgres, queue, worker
│  └─ trace-fixtures/               # recorded real traces for demos and contract tests
│
├─ tooling/                         # scripts, codegen, benchmarks
├─ docs/adr/                        # Architecture Decision Records
├─ .github/                         # workflows, templates, CODEOWNERS, FUNDING
├─ .devcontainer/
├─ .cursor/rules/project.mdc
├─ docker-compose.yml
├─ Dockerfile
├─ turbo.json  pnpm-workspace.yaml  biome.json  .dependency-cruiser.cjs
└─ README.md  ARCHITECTURE.md  CONTRIBUTING.md  SECURITY.md  CODE_OF_CONDUCT.md  LICENSE
```

Allowed dependency direction (enforce with dependency-cruiser):
`trace-model` <- `otlp` <- `cinema-engine` <- `cinema-renderer-pixi` <- `cinema-react` <- `apps/web`.
`store`, `source-resolver` depend only on `trace-model`. `apps/server` may use `otlp`, `store`, `source-resolver`, `trace-model`. **`cinema-engine` must never import from `apps/*`, `store`, or any UI package.**

## 5. CORE DOMAIN MODEL (implement in `trace-model` with Zod)

```ts
type SpanId = string & { __brand: 'SpanId' }
type TraceId = string & { __brand: 'TraceId' }

interface Span {
  traceId: TraceId
  spanId: SpanId
  parentId: SpanId | null
  service: string
  name: string
  kind: 'internal' | 'server' | 'client' | 'producer' | 'consumer'
  startNs: bigint            // normalized, skew-corrected
  endNs: bigint
  status: 'ok' | 'error' | 'unset'
  attributes: Record<string, AttrValue>   // already redacted
  events: SpanEvent[]
  links: SpanLink[]
  code?: { file?: string; function?: string; line?: number; repo?: string }
  repairs: RepairNote[]      // what normalization changed, shown in the UI
}

interface Trace { traceId: TraceId; spans: Span[]; rootSpanId: SpanId | null; startNs: bigint; endNs: bigint }

// Engine
interface SceneGraph { nodes: GraphNode[]; edges: GraphEdge[] }   // service | module | datastore | queue
interface SceneState { t: number; trains: TrainState[]; nodeStates: NodeState[]; camera: CameraState }
interface Clock { now(): number; play(): void; pause(): void; seek(t: number): void; setRate(r: number): void; subscribe(cb): () => void }
interface Renderer { init(host: HTMLElement): Promise<void>; draw(state: SceneState): void; resize(w: number, h: number): void; destroy(): void; pick(x: number, y: number): PickResult | null }
interface StorageAdapter { putTrace; getTrace; listTraces(query); durationStats(opKey); health(); close() }
```

Use `bigint` nanoseconds in the model; convert to `number` milliseconds only at the engine boundary.

## 6. SOURCE MAPPING FALLBACK LADDER

Resolve a span to code in this order:
1. Explicit OTel attrs: `code.file.path`, `code.function.name`, `code.line.number` (and legacy `code.filepath`, `code.function`, `code.lineno`).
2. Exception stack frame from span events.
3. Heuristic from span name (`GET /users/:id` -> route handler search via ts-morph; `Class.method` -> symbol search).
4. Unresolved: show the span without a code link and a "how to add code attributes" help link.

Git features: `blame` for the resolved line, `log` for the file or symbol (last N commits, authors, diffs), "changed recently" badge when the code changed within the configurable window and the span is also slower than usual.

## 7. PHASES

Each phase has tasks and **acceptance criteria**. Do not start a phase until the previous phase's criteria pass in CI.

### PHASE 0: Foundation (repo, tooling, CI skeleton)
Tasks:
1. Scaffold monorepo (pnpm, Turborepo, shared config package, Biome, dependency-cruiser, Vitest workspace).
2. Strict tsconfig presets (`base`, `node`, `react`, `library`) with project references.
3. Devcontainer, `.editorconfig`, `.nvmrc`, `.gitignore`, issue and PR templates, CODEOWNERS, LICENSE (MIT or Apache-2.0).
4. GitHub Actions: install with cache, Biome, typecheck, unit tests, build on PRs.
5. Changesets configured. Renovate configured.
6. Husky + lint-staged + commitlint (Conventional Commits).

Acceptance: `pnpm i && pnpm build && pnpm test` green from a clean clone; CI green; boundary lint fails if a forbidden import is added (prove it with a test).

### PHASE 1: Trace model, fixtures, test kit
Tasks:
1. `trace-model`: Zod schemas, branded IDs, `Trace`/`Span` types, validators, helpers (`durationMs`, `children`, `criticalPath`).
2. `test-kit`: deterministic trace generator (seeded) with knobs: depth, fan-out, span count, error rate, skew, orphans, cycles, negative durations, huge attributes. Hand-written realistic fixtures (shop checkout, fan-out search, queue consumer, retry storm).
3. `ManualClock` and seeded RNG helpers.

Acceptance: 100% branch coverage on helpers; generator is reproducible by seed; fast-check arbitraries exported for reuse.

### PHASE 2: OTLP decoding and normalization
Tasks:
1. Decode OTLP/HTTP JSON and protobuf (gzip supported) into raw spans with Zod validation and size limits.
2. Normalizers (each pure, each with property tests): hex/base64 ID normalization, orphan repair (re-parent to synthetic root, record a `RepairNote`), clock skew correction between services (child cannot start before parent; use client/server span pairs), cycle breaking, negative or zero duration fixing, attribute truncation, semantic-convention mapping (legacy to current attribute names).
3. Redaction: allowlist-based attribute filter plus pattern scrubbers (emails, tokens, card-like numbers). Redaction runs before anything is stored.
4. Contract tests with recorded payloads from Node, .NET, Java, Python, Go SDKs in `examples/trace-fixtures`.

Acceptance: property test "any generated garbage trace normalizes without throwing and yields a valid `Trace`" passes 10k runs; Stryker mutation score >= 80% on `otlp`; every real-SDK fixture decodes.

### PHASE 3: Engine core (no rendering)
Tasks:
1. `graph-builder`: derive architecture graph from one or many traces (service -> service edges, db/queue nodes from `db.*`, `messaging.*` attributes, module nodes from `code.*`), with stable node IDs so the map does not jump between traces.
2. `layout`: ELK layered layout in a Web Worker (Comlink), then octilinear (0/45/90 degree) edge routing, line coloring per service group, station labels with collision avoidance. Layout results cached by graph hash.
3. `timeline`: pure `(trace, layout, t) -> SceneState`. Spans become keyframes along edges. Time scaling modes: real-time, compressed (long idle gaps shrunk), critical-path focus. Handle parallel spans (multiple trains), async hops (queue gap shown as a "waiting" station), retries, errors (train derails with pulse).
4. `effects`: heat score = percentile of span duration within that operation's historical distribution (fallback to within-trace ranking when no history). Smooth color ramp, color-blind-safe palette option.
5. `picking`: rbush index for nodes, edges, trains. `camera`: pan, zoom, follow-train, fit-to-trace.
6. `clock`: `RealClock`, `ManualClock`, `ScrubClock` supporting reverse and rate changes.

Acceptance: snapshot tests of `SceneState` at fixed `t` for all fixtures; property tests (determinism, monotonic train progress, no NaN, bounded positions); layout of 500-node graph under 300ms in worker; engine bundle has zero DOM or Node imports (verified by a test that bundles it for a neutral platform).

### PHASE 4: Renderer and React wrapper
Tasks:
1. `cinema-renderer-pixi`: draw map (lines, stations, labels), trains with glow shader for heat, error pulse, hover and selection states, level-of-detail (hide labels when zoomed out, aggregate trains beyond a threshold), object pooling, Canvas fallback if WebGL is unavailable.
2. `cinema-react`: `<RequestCinema trace clock onSelect />`, hooks (`useClock`, `useSceneState`), proper cleanup, StrictMode safe, SSR safe (renders nothing server-side).
3. Storybook stories for every visual state (idle, playing, error, huge trace, reduced motion, dark and light).

Acceptance: 60fps with 5,000 spans on a mid-range laptop profile (recorded Playwright trace + FPS probe); no memory growth after 100 mount/unmount cycles; visual regression screenshots at fixed `ManualClock` times pass in 3 browsers.

### PHASE 5: Web app
Tasks:
1. App shell: TanStack Router (typed routes: `/`, `/traces`, `/traces/$traceId`, `/import`, `/settings`), error boundaries, suspense, toasts, theme (dark default, light, system).
2. `traces` feature: virtualized list, search, filters (service, duration range, error only, time range, attribute key/value), URL-synced filter state, live badge.
3. `player` feature: play/pause, scrubber with span density minimap, speed, step prev/next span, loop, follow-request, shareable deep link with timestamp (`?t=1234`).
4. `map` feature: pan/zoom, hover tooltips, click select, minimap, legend, heat/color-blind toggle.
5. `inspector` feature: tabs for Overview, Attributes, Events, Code, History, Repairs. Code tab uses a lightweight read-only viewer (Shiki) with the resolved line highlighted. History tab lists commits, authors, relative time, diff view.
6. `import` feature: drag-and-drop OTLP JSON, Jaeger JSON, and Zipkin JSON; converts in a worker; uses the `memory` adapter so the **hosted demo needs no backend**.
7. `table-view`: full accessible text alternative of the trace (sortable table, keyboard navigable, screen-reader friendly).
8. Keyboard shortcuts with a `?` help dialog (space, arrows, `+`/`-`, `f` follow, `t` table, `/` search).
9. Empty, loading, error, and offline states for every screen.

Acceptance: Lighthouse Performance >= 90, Accessibility 100, Best Practices >= 95 on the demo build; initial JS under the budget in section 10; every interactive element reachable by keyboard.

### PHASE 6: Server, storage, live mode
Tasks:
1. `store`: `StorageAdapter` contract tests (one shared suite run against every adapter). SQLite adapter with migrations, WAL mode, indices on trace id, service, start time, duration, error flag; retention policy (max age, max traces); `durationStats` percentile tables (t-digest or histogram buckets) per operation key. DuckDB optional adapter. Memory adapter.
2. `apps/server`: Hono app. `POST /v1/traces` (OTLP/HTTP), `GET /api/traces` (query + cursor pagination), `GET /api/traces/:id`, `GET /api/graph`, `GET /api/stats/:opKey`, `GET /api/source` (resolved file + symbol), `GET /api/history` (git log/blame), `GET /api/stream` (SSE), `GET /healthz`, `GET /readyz`, `GET /metrics` (Prometheus). OpenAPI document generated from Zod (`@hono/zod-openapi`).
3. Pipeline: bounded queue with backpressure (drop-oldest, counted in a metric), batching writes, graceful shutdown that drains the queue.
4. Config: single Zod-validated env schema (port, db path, retention, allowed origins, API key, redaction allowlist path, source root and repo mapping).
5. Security middleware: CORS allowlist, rate limiting on ingest, optional API key (`Authorization: Bearer`), secure headers (CSP, etc.), request size limits, path-traversal-proof source resolver (only files inside configured roots).
6. `source-resolver`: ladder from section 6, ts-morph index cached and invalidated on file change, git operations via simple-git with timeouts and result caching.
7. Self-telemetry: the server instruments itself with the OTel SDK and sends traces to its own ingest endpoint (toggle by env) to dogfood.

Acceptance: adapter contract suite green for sqlite and memory (and duckdb if enabled); k6 test sustains the target ingest rate (set in budgets) with p99 latency under budget and flat memory; killing the server mid-ingest loses no already-acknowledged traces; OpenAPI spec published as CI artifact.

### PHASE 7: SDK helper and example system
Tasks:
1. `sdk-node`: `initCinema({ serviceName, endpoint })` registers the OTel Node SDK with OTLP exporter and auto-instrumentations, plus a span processor that adds `code.*` attributes from the call stack (opt-in, sampled to limit overhead).
2. `examples/shop-microservices`: docker-compose with API gateway (Node), orders (Node), payments (**.NET minimal API** instrumented with `ActivitySource` and `code.*` tags), inventory (Node), Postgres, Redis or RabbitMQ, a background worker, a load generator that produces realistic traffic including occasional slow queries, retries and failures, plus a "bad deploy" scenario toggle to showcase the changed-recently + slower badge.
3. Short guides: instrument Node, .NET, Java, Python, Go (docs only for the last three).

Acceptance: `docker compose up` from the example directory shows live trains in the UI within 60 seconds on a clean machine; the .NET service's spans resolve to code links.

### PHASE 8: Hardening, performance, accessibility, security
Tasks:
1. Soak and chaos: script floods malformed and oversized OTLP for 10 minutes; memory stays flat, server stays up.
2. Performance budgets in CI (section 10) with failures blocking merge. Bundle analysis report on PRs.
3. Rust/WASM is **optional and only after profiling**: if layout or timeline hot paths exceed budget at 50k spans, port the hot function behind the same interface and document the benchmark in an ADR.
4. Accessibility pass: axe in Playwright and Storybook, `prefers-reduced-motion` switches to step mode, focus management, contrast checks for both themes and the color-blind palette.
5. Security pass: threat model doc, dependency audit, Trivy on image, secret scanning, review of redaction coverage with adversarial fixtures, SBOM generated on release.
6. Error budget for the UI: global error boundary reports to a local log; no unhandled promise rejections (tested).

Acceptance: all budgets green; zero axe violations; zero high/critical vulnerabilities; threat model reviewed.

### PHASE 9: Docs, demo, release, launch
Tasks:
1. README: one-line pitch, looping demo GIF/MP4 above the fold, `docker compose up` quick start, hosted demo link, feature list, architecture diagram, comparison table (vs Jaeger, Zipkin, Grafana Tempo) with honest trade-offs, benchmark table, badges (CI, coverage, mutation score, bundle size, npm, license, OpenSSF Scorecard).
2. `ARCHITECTURE.md`, ADRs in `docs/adr/` (monorepo, pure engine, Pixi, ELK worker, SQLite default, redaction-first, Hono, WASM decision).
3. Astro Starlight docs: getting started, concepts (trains, heat, repairs), instrumentation guides, configuration reference, API reference (generated), embedding the component, FAQ, troubleshooting.
4. Hosted demo on GitHub Pages (browser-only mode with bundled sample traces).
5. Release pipeline: Changesets release PR, npm publish with provenance for `@request-cinema/engine`, `/react`, `/renderer-pixi`, `/sdk-node`, `/trace-model`; Docker image to GHCR (multi-stage, distroless or alpine, non-root, healthcheck); GitHub Release notes auto-generated; SBOM attached.
6. Community files: CONTRIBUTING (setup in 3 commands), CODE_OF_CONDUCT, SECURITY policy, issue forms, `good first issue` labels (create 10 real ones), roadmap in Discussions.
7. Launch assets: 60-second demo video, 3 screenshots, a blog post draft ("Building a metro map for your requests"), social card image.

Acceptance: a stranger can go from README to seeing the demo in under 2 minutes; release dry-run succeeds; docs site builds with no broken links (link checker in CI).

## 8. TESTING STRATEGY (act like a QA team)

| Layer | Tooling | Scope |
|---|---|---|
| Unit | Vitest | pure functions in model, otlp, timeline, layout, effects |
| Property-based | fast-check | arbitrary traces never crash; determinism; invariants (child inside parent after repair, no NaN positions, monotonic progress) |
| Mutation | Stryker | `trace-model`, `otlp`, `cinema-engine/timeline`, threshold >= 80% |
| Contract | Vitest + recorded payloads | real SDK OTLP payloads decode; adapter suite shared across storage adapters |
| Integration | Testcontainers | server + real SQLite/DuckDB, Postgres-backed example smoke test |
| Component | Storybook + Vitest browser | inspector, controls, filters, empty/error/loading states |
| E2E | Playwright (3 browsers) | critical journeys below |
| Visual regression | Playwright screenshots + `ManualClock` | frames at fixed times, light/dark, reduced motion |
| Performance | k6, Playwright traces, FPS probe | ingest throughput/latency, render FPS, layout time, bundle size |
| Accessibility | axe-core, keyboard-only E2E | WCAG 2.2 AA |
| Security | CodeQL, Trivy, Renovate, adversarial fixtures | injection, path traversal, PII leakage, oversized payloads |
| Chaos/soak | scripted | malformed floods, kill -9 during ingest, disk full |

**E2E journeys (must all exist):**
1. Drop a trace file -> map appears -> press play -> trains move -> pause -> scrub back -> frame matches.
2. Server mode: send OTLP via curl -> trace appears live in list -> open -> play.
3. Click a node -> Inspector opens -> Code tab shows highlighted line -> History tab shows commits.
4. Filter by error-only and duration > N -> list updates and URL reflects filters -> reload keeps state.
5. Keyboard-only: complete journey 1 without a mouse.
6. Reduced motion enabled: step mode works, no continuous animation.
7. Malformed file import shows a clear error and recovers.
8. Offline server: UI shows offline state and recovers when the server returns.
9. Deep link `/traces/<id>?t=1234` opens at the right moment.
10. Large trace (50k spans) opens without freezing (long task budget).

**Rules for flake-free tests:** never rely on real time; always `ManualClock`; seeded RNG; no arbitrary sleeps; wait on explicit UI states; run Playwright with trace-on-first-retry and upload artifacts.

**Coverage gates:** 90% lines and 85% branches on core packages; overall 80%; diff coverage 90% on PRs.

## 9. CI/CD (GitHub Actions)

- `ci.yml` (PRs): cache -> Biome -> typecheck -> boundary check -> unit + property -> build -> integration -> Storybook tests -> Playwright sharded across 3 browsers -> a11y -> perf budgets -> bundle report comment -> docs build + link check.
- `mutation.yml` (nightly + on core changes): Stryker, upload report, badge.
- `soak.yml` (nightly): chaos script, memory trend asserted.
- `security.yml`: CodeQL, Trivy, dependency review, OSSF Scorecard, secret scan.
- `preview.yml`: deploy Storybook and demo preview per PR.
- `release.yml` (main): Changesets PR; on merge publish npm with provenance, push Docker image, deploy docs and demo, create GitHub Release with SBOM.
- All third-party actions pinned by SHA; minimal `permissions:` per job; concurrency groups cancel superseded runs.

## 10. PERFORMANCE BUDGETS (enforced in CI)

- Initial JS (gzipped) for the web app: <= 250 KB; engine package <= 60 KB gzipped; lazy-load Pixi, Shiki, and the inspector.
- Rendering: >= 60fps at 5k spans, >= 30fps at 50k spans (LOD kicks in).
- Layout: 500 nodes in <= 300ms in the worker; main-thread long tasks <= 50ms.
- Ingest: record the achieved baseline on CI hardware (target thousands of spans per second on one core); p99 ingest latency budget set from baseline; regression > 10% fails.
- Time to interactive on demo: <= 2.5s on simulated mid-tier mobile.
- Memory: no leak across 100 trace open/close cycles (heap growth < 5%).

## 11. SECURITY REQUIREMENTS

- Redaction before storage, allowlist-first, with pattern scrubbers; document exactly what is stored.
- Strict input limits (payload size, span count per request, attribute count/length, nesting depth).
- Source resolver confined to configured roots; reject symlink escapes; never execute repo code.
- Git commands via library with argument arrays; no shell interpolation.
- Rate limit ingest; optional API key; CORS allowlist; CSP, HSTS (when TLS), `X-Content-Type-Options`, `Referrer-Policy`.
- Docker image: non-root, read-only root FS compatible, no secrets baked in, healthcheck, pinned base digest.
- Supply chain: lockfile enforced, `pnpm audit` gate, provenance, SBOM, Renovate with grouped updates.
- `SECURITY.md` with disclosure process; `docs/threat-model.md`.

## 12. ACCESSIBILITY REQUIREMENTS

- WCAG 2.2 AA. Full keyboard operation; visible focus rings; skip links.
- `prefers-reduced-motion` => step-through mode; a manual toggle in settings.
- Canvas has an accessible equivalent: the table view, plus ARIA live announcements for play state and selected span.
- Color-blind safe heat palette option; never color-only encoding (use icons/patterns for errors).
- Tested with axe in CI and a manual screen-reader checklist in `docs/a11y.md`.

## 13. OBSERVABILITY, CONFIG, DX

- Server logs: structured JSON (pino), request IDs, no sensitive attributes.
- `/metrics`: ingest rate, queue depth, dropped spans, store latency, SSE clients.
- One `.env.example`; every variable documented in the config reference and validated at startup with a readable error.
- DX: `pnpm dev` starts server, web, and a trace generator; `pnpm demo` starts the shop example; `pnpm bench` runs benchmarks; `pnpm verify` runs everything CI runs locally.

## 14. DEFINITION OF DONE (for every task and PR)

- Types, tests (unit + property where relevant), docs updated.
- Boundary lint, typecheck, Biome, tests green locally and in CI.
- No new `any`, no TODO without an issue link.
- Bundle and performance budgets unaffected or consciously adjusted with an ADR.
- Accessibility considered for any UI change (axe + keyboard check).
- Conventional Commit message; Changeset added for publishable packages.

## 15. `.cursor/rules/project.mdc`

```
---
description: Request Cinema project rules
alwaysApply: true
---
- Read docs/MASTER_SPEC.md before starting any task; follow its phases in order.
- cinema-engine is pure: no React, DOM, network, Date.now, Math.random. Use injected Clock and seeded RNG.
- timeline(trace, layout, t) must stay a pure deterministic function.
- Validate every boundary with Zod; derive types from schemas.
- TanStack Query for server state, Zustand for UI-only state. Nothing else global.
- Packages expose only index.ts. No deep cross-package imports (dependency-cruiser enforces).
- No any, no non-null assertions, no default exports (except route files). Files < 250 lines.
- Tests first for logic in trace-model, otlp, timeline, layout. Property test for every normalizer.
- Never use real time or arbitrary sleeps in tests. ManualClock + seeded RNG only.
- Redact attributes before persistence. Resolve source paths only inside configured roots.
- Accessibility is a feature: keyboard, reduced motion, ARIA, table alternative.
- Before coding: restate the task and list files to touch. After coding: run typecheck, lint, tests.
- Never invent APIs; read the installed package types. Ask one specific question if unsure.
- Conventional Commits. Add a Changeset for publishable package changes.
```

## 16. HOW TO OPERATE (instructions to Cursor)

1. Start with **Phase 0, Task 1** only. Show the plan, then implement.
2. After each task, print: what changed, how it was verified, what is next.
3. Keep a living `docs/PROGRESS.md` checklist of phases and tasks; tick items as acceptance criteria pass.
4. When a design decision is made, write an ADR in `docs/adr/` (short: context, decision, consequences).
5. If a budget or acceptance criterion cannot be met, stop and report the measurement and options instead of weakening the criterion.
6. Do not add features outside section 1 without asking.

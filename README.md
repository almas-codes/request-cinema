# 🎬 Request Cinema

<div align="center">

[![CI](https://github.com/almas-codes/request-cinema/actions/workflows/ci.yml/badge.svg)](https://github.com/almas-codes/request-cinema/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-5.7%20Strict-blue.svg)](https://www.typescriptlang.org/)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-OTLP%20Native-orange.svg)](https://opentelemetry.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

### *Stop staring at endless waterfall charts. Watch your requests travel through your architecture like express trains on a living metro map.*

[Quick Start](#-quick-start-in-30-seconds) • [Why We Built This](#-why-we-built-this) • [Interactive Features](#-the-experience) • [How It Works](#-under-the-hood) • [Comparison](#-honest-comparison) • [Contributing](CONTRIBUTING.md)

</div>

---

## 💡 Why We Built This

Ever tried debugging a cascading timeout at 3:00 AM using a traditional waterfall Gantt chart?

You're scrolling through 3,000 horizontal bars across 40 microservices, squinting at nanosecond offsets, cross-referencing log timestamps, and trying to mentally reconstruct which service called what. It feels like trying to read *The Matrix* in raw green hex.

We asked a simple question: **What if your distributed architecture was rendered as a clean, interactive subway transit map, and every incoming request was an express train?**

- **Services, databases, and message queues** are the stations.
- **RPCs, HTTP calls, and async pub/subs** are the railway tracks.
- **Spans** are trains traveling along those tracks in real time-scaled duration.
- **Slow operations** physically heat up—shifting from cool neon teal to glowing amber and blazing crimson based on real historical percentiles ($p50$, $p90$, $p99$).
- **Unhandled 500 errors?** The train literally derails with visual sparks and smoke, pointing you right to the crime scene.
- **Curious who wrote the code?** Click any station or train to instantly open the exact file, function, highlighted line number, and recent Git blame.

No proprietary agents. No vendor lock-in. Just pure, open standard **OpenTelemetry (OTLP)**.

---

## 🚇 The Mental Model

```text
                           [ CLIENT BROWSER ]
                                   │
                                   │ (HTTP POST /checkout)
                                   ▼
                         ┌───────────────────┐
                         │   API Gateway     │
                         └─────────┬─────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │ (gRPC)                      │ (gRPC)
                    ▼                             ▼
         ┌───────────────────┐         ┌─────────────────────┐
         │   Order Service   │         │    Auth Service     │
         └─────────┬─────────┘         └──────────┬──────────┘
                   │                              │
     ┌─────────────┴─────────────┐                │ (cache check)
     ▼                           ▼                ▼
┌──────────────┐     ┌──────────────────────┐ ┌─────────┐
│ Postgres DB  │     │   Kafka Event Bus    │ │  Redis  │
└──────────────┘     └───────────┬──────────┘ └─────────┘
                                 │
                   (Async consumer train travels)
                                 │
                                 ▼
                     ┌──────────────────────┐
                     │  Inventory Worker    │
                     └──────────────────────┘
```

When you hit **Play**, you watch requests enter at the gateway, branch into parallel child trains, pause at databases, and hop onto async queues. You don't just *analyze* a trace—you *feel* the flow of your entire system.

---

## ⚡ Quick Start in 30 Seconds

You don't even need Docker or a database to take Request Cinema for a spin. It runs right in your browser!

### Option A: Zero-Server In-Browser Demo (Fastest)

```bash
# 1. Clone the repository
git clone https://github.com/almas-codes/request-cinema.git
cd request-cinema

# 2. Install dependencies
pnpm install

# 3. Launch the web player
pnpm --filter @request-cinema/web dev
```

Open **`http://localhost:5173`** in your browser. Click **Import Trace** to load your own OTLP JSON trace file, or click any of the built-in scenario buttons:
- 🛒 **E-Commerce Checkout** (happy path with database and cache hits)
- 🔍 **Fan-out Product Search** (high-concurrency parallel queries)
- ⚡ **Retry Storm** (intermittent database errors triggering exponential backoff)
- 📬 **Async Queue Pipeline** (decoupled publisher and worker spans)

---

### Option B: Full-Stack Mode with Live OTLP Ingestion

Send live telemetry directly from your existing apps or OpenTelemetry Collector:

```bash
# Launch both backend receiver and frontend viewer
pnpm dev
```

- **Web UI**: `http://localhost:5173`
- **OTLP Ingestion Endpoint**: `http://localhost:3001/v1/traces` (supports HTTP JSON and gzip)
- **Documentation**: `http://localhost:4321`

#### Send a trace with curl:
```bash
curl -X POST http://localhost:3001/v1/traces \
  -H "Content-Type: application/json" \
  -d @examples/trace-fixtures/node-express-otlp.json
```
Watch the train depart immediately across your screen via live Server-Sent Events (SSE)!

---

### Option C: Complete Docker Compose Stack

Want a self-contained environment with pre-configured demo microservices?

```bash
docker compose up --build
```
Open **`http://localhost:3000`** to see real microservices communicating and generating live traffic.

---

## 🎮 The Experience

### 1. Interactive Cinema Scrubber
- **Play / Pause**: Smooth 60fps hardware-accelerated WebGL animation powered by PixiJS.
- **Scrub Back & Forward**: Jump to any millisecond of a trace. The state engine is 100% deterministic—scrubbing to $t = 420\text{ms}$ always displays the exact same frame.
- **Speed Controls**: Run at $0.25\times$ to inspect microsecond race conditions, or blast through at $8\times$.
- **Step Mode**: Advance span-by-span to follow the request step-by-step.

### 2. Relative Latency Heatmap
A 200ms database query might be blazing fast for an analytics query, but disastrously slow for a Redis cache lookup. 
Request Cinema calculates heat **relatively** based on the historical percentile distribution for that specific operation:
- 🟢 **Cool Teal / Blue**: Running at or below $p50$ (healthy).
- 🟡 **Warm Amber**: Approaching $p90$ (degraded).
- 🔴 **Neon Crimson Glow**: Exceeding $p99$ (bottleneck).
- 🎨 **Color-Blind Safe Mode**: Full high-contrast palette option built right in.

### 3. Derailment Physics for Errors
When a service returns an error status code (`STATUS_CODE_ERROR`), the train doesn't just display a tiny red dot. It triggers a physical derailment effect with smoke and particle sparks at the station where the error originated, making root cause identification unmistakable.

### 4. Direct Jump to Code & Git Blame
Clicking any span opens the **Inspector Panel**:
- **Overview & Attributes**: Full span metadata with automatic redaction of secrets, passwords, cookies, and tokens.
- **Source Code Tab**: Resolves the span to the exact local or remote repository file with highlighted line numbers.
- **Git History & Blame**: See the commit SHA, author, and commit message for the exact lines executing that span.
- **Heuristics & Normalization Repairs**: View any clock-skew adjustments, synthetic orphan repairs, or cycle-breaking applied during ingestion.

### 5. Accessible Table View (<kbd>T</kbd>)
Accessibility isn't an afterthought. Press <kbd>T</kbd> at any time to toggle between the graphical Metro Canvas and a fully accessible, keyboard-navigable, screen-reader friendly **Table View** that complies with WCAG 2.2 AA standards.

---

## ⌨️ Keyboard Shortcuts

Speed matters during an incident. Request Cinema is built for keyboard-first navigation:

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause playback |
| <kbd>→</kbd> / <kbd>←</kbd> | Step forward / backward by 50ms |
| <kbd>+</kbd> / <kbd>-</kbd> | Increase / decrease playback speed |
| <kbd>T</kbd> | Toggle between Metro Map and Accessible Table View |
| <kbd>C</kbd> or <kbd>?</kbd> | Open Keyboard Shortcuts cheat-sheet |
| <kbd>Esc</kbd> | Close inspector or modals |

---

## 📊 Honest Comparison

We love Jaeger, Zipkin, and Tempo. Here is how Request Cinema compares and where each shines:

| Feature | Request Cinema | Jaeger / Zipkin | Grafana Tempo / APM |
| :--- | :---: | :---: | :---: |
| **Mental Model** | 🚇 Topological Metro Map | 📊 Waterfall Gantt Chart | 📈 Flamegraph / Tree |
| **Animation & Flow** | 🚄 Real-time & Scrubbable Trains | ❌ Static snapshot | ❌ Static snapshot |
| **Bottleneck Visibility** | 🔥 Relative Percentile Heatmap | ⚠️ Raw duration text | ⏱️ Color duration bars |
| **Root Cause Detection**| 💥 Visual Train Derailment | ⚠️ Red border on span | ⚠️ Red error badge |
| **Source Code & Git** | 💻 Integrated Code & Git Blame | ❌ Not available | ⚠️ 3rd-party APM link |
| **Zero-Server Browser Mode**| 🌐 Yes (Drop a file and inspect) | ❌ Requires daemon | ❌ Requires object storage |
| **Clock Skew Repair** | 🛠️ Automatic Topological Healing | ⚠️ Unadjusted | ⚠️ Manual offset |
| **Best Used For** | **Incident triage, architecture onboarding, executive demos, deep root-cause debugging** | High-volume raw trace search & historical auditing | Enterprise multi-petabyte log/metric/trace correlation |

---

## 🏗️ Under the Hood

Request Cinema is built as a modular monorepo using **Turborepo** and **pnpm**:

```mermaid
graph TD
    classDef core fill:#1e293b,stroke:#6366f1,stroke-width:2px,color:#fff;
    classDef ui fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff;
    classDef server fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff;

    A["@request-cinema/trace-model"]:::core --> B["@request-cinema/otlp"]:::core
    B --> C["@request-cinema/cinema-engine"]:::core
    C --> D["@request-cinema/cinema-renderer-pixi"]:::ui
    D --> E["@request-cinema/cinema-react"]:::ui
    E --> F["apps/web (React 19 + Vite SPA)"]:::ui

    A --> G["@request-cinema/store (SQLite WAL & Memory)"]:::server
    A --> H["@request-cinema/source-resolver (AST & Git)"]:::server

    B --> I["apps/server (Hono REST & SSE)"]:::server
    G --> I
    H --> I
    A --> I
```

### Architectural Guarantees:
- **Zero DOM in Core**: `packages/cinema-engine` contains zero references to the DOM, React, Node, `Date.now()`, or `Math.random()`. It takes an injected Clock and seeded RNG, making it 100% testable and portable.
- **Pluggable Renderers**: The rendering engine sits behind a clean `Renderer` interface. PixiJS (WebGL) is the primary implementation, with Canvas fallback.
- **Strict Architecture Boundaries**: Monitored via `dependency-cruiser`. No circular dependencies and no deep imports across packages.
- **Type Safety**: TypeScript 5.7 in strict mode with composite project references. Zero `any` and zero non-null `!` assertions across the entire codebase.
- **Lean Bundle Size**: The web application's gzipped JavaScript bundle is just **149.93 KB** (well under the 250 KB budget!).

---

## 🔒 Security & Privacy First

Telemetry data often contains sensitive operational info. We designed Request Cinema to be safe for production environments:

- **Redaction by Default**: All incoming span attributes pass through regex sanitizers that redact emails, passwords, bearer tokens, API keys, session cookies, and credit cards before persistence.
- **Sandbox Source Resolution**: Filesystem lookups in `source-resolver` reject directory traversal escapes (e.g. `../../etc/passwd`) and strictly restrict reading to configured source roots.
- **Zero Arbitrary Execution**: Git queries and AST analyses use argument arrays without shell interpolation.
- **Safe SQLite**: Uses Node's native SQLite with parameterized statements and WAL mode.

---

## 🧪 Comprehensive Testing Suite

Quality is guaranteed with every commit:

```bash
# Run all quality checks in one command:
pnpm verify
```

- **Biome**: 128 source files checked in under 100ms.
- **Dependency Cruiser**: 182 modules & 302 dependencies analyzed for zero boundary violations.
- **TypeScript**: `tsc --build` with zero type errors.
- **Vitest Unit & Contract Tests**: 42/42 tests passing across all packages.
- **Fast-Check Property Fuzzing**: 1,000-run property tests asserting that arbitrary, randomly-generated malformed traces normalize safely without crashing.

---

## 🤝 Contributing

We love contributions! Whether you're fixing a typo in documentation, improving a transit line layout algorithm, or adding a new sample scenario:

1. Check out [CONTRIBUTING.md](CONTRIBUTING.md) for local setup instructions.
2. Ensure `pnpm verify` passes locally.
3. Submit a PR following [Conventional Commits](https://www.conventionalcommits.org/).

---

## 📄 License

Request Cinema is open-source software licensed under the **[MIT License](LICENSE)**.

---

<div align="center">
Built with ❤️ for engineers who believe observability should be as intuitive and enjoyable as watching a great film.
</div>

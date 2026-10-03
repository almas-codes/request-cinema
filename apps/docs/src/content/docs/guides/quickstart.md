---
title: Quick Start
description: Get started with Request Cinema in less than 5 minutes.
---

## 1. Zero-Server Browser Mode

You can run Request Cinema entirely within your browser without running any backend or database.

1. Clone the repository:
   ```bash
   git clone https://github.com/request-cinema/request-cinema.git
   cd request-cinema
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the web viewer:
   ```bash
   pnpm --filter @request-cinema/web dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.
5. Click **Import Trace** to load a local OTLP JSON file or choose one of the built-in sample scenarios (E-Commerce Checkout, Fan-out Search, Retry Storm).

## 2. Full-Stack Mode with OTLP Receiver

To stream live traces into Request Cinema from your OpenTelemetry Collector or microservices:

1. Launch both the backend server and web UI:
   ```bash
   pnpm dev
   ```
2. The Hono backend will start on port `4318` listening for OTLP HTTP JSON (`/v1/traces`), and expose the API and SSE stream on port `3001`.
3. Configure your OpenTelemetry Collector:
   ```yaml
   exporters:
     otlphttp/cinema:
       endpoint: "http://localhost:3001"

   service:
     pipelines:
       traces:
         receivers: [otlp]
         processors: [batch]
         exporters: [otlphttp/cinema]
   ```

## 3. Docker Compose

Run the entire stack with a pre-instrumented demo microservices environment:

```bash
docker compose up --build
```
Open [http://localhost:3000](http://localhost:3000) to view live traffic!

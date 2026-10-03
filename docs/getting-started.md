# Getting Started with Request Cinema

Request Cinema provides an intuitive way to observe distributed systems by animating OpenTelemetry traces as trains on an architectural metro map.

## 📦 Installation & Quick Start

### 1. Run via Docker Compose
The easiest way to start Request Cinema is with Docker:

```bash
docker compose up -d
```
This runs the web interface on `http://localhost:3000` and the OTLP/HTTP ingest server on `http://localhost:4318`.

### 2. Configure Your Applications
Point your OpenTelemetry exporters to the Request Cinema ingest endpoint:
- **Endpoint**: `http://localhost:4318/v1/traces`
- **Protocol**: `http/protobuf` or `http/json`

### 3. In-Browser Demo
If you don't have a backend running, open the web app and click **Import** to load sample traces or drag-and-drop your own `.json` trace files directly into the browser.

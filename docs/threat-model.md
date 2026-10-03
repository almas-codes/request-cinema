# Threat Model & Security Posture

## 1. Attack Surface Overview

### Ingest Endpoint (`POST /v1/traces`)
- **Threat**: Maliciously oversized payloads causing server out-of-memory crashes.
- **Mitigation**: Strict payload size limits (10MB default) and bounded memory ingestion queue with drop-oldest backpressure.
- **Threat**: Ingestion of sensitive customer PII or API credentials.
- **Mitigation**: Pre-persistence regex pattern scrubbers (JWTs, auth tokens, credit cards, emails).

### Source Code Resolver (`/api/source`, `/api/history`)
- **Threat**: Directory traversal attacks trying to read `/etc/passwd` or application environment secrets (`../../.env`).
- **Mitigation**: Path canonicalization (`path.resolve`, `path.relative`) strictly confining file queries inside `SOURCE_ROOT`. Escaping attempts return HTTP 400.
- **Threat**: Shell injection via Git commands.
- **Mitigation**: Read-only queries executed via `simple-git` using argument arrays, entirely bypassing shell interpolation.

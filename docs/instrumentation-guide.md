# OpenTelemetry Instrumentation Guide

How to send distributed traces from your favorite runtime to Request Cinema.

---

## 🟢 Node.js / TypeScript

Use `@request-cinema/sdk-node` or the standard OpenTelemetry Node SDK:

```bash
pnpm add @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http @request-cinema/sdk-node
```

```typescript
import { initCinema } from '@request-cinema/sdk-node';

initCinema({
  serviceName: 'my-service',
  endpoint: 'http://localhost:4318/v1/traces',
  sampleCodeAttributes: true, // adds code.file.path and code.line.number
});
```

---

## 🟣 .NET / C#

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddSource("MyCompany.OrderService")
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(opt => opt.Endpoint = new Uri("http://localhost:4318/v1/traces")));
```

---

## 🐍 Python

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install
```

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
opentelemetry-instrument python main.py
```

---

## 🔵 Go

```go
exporter, err := otlptracehttp.New(ctx,
    otlptracehttp.WithEndpoint("localhost:4318"),
    otlptracehttp.WithInsecure(),
)
```

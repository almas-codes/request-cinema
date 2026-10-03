# E-Commerce Microservices Example

This example demonstrates how **Request Cinema** automatically discovers and animates real distributed architecture from live OpenTelemetry traces.

## 🚀 Running the Example

```bash
docker compose up -d
```

Open `http://localhost:3000` to watch requests animate as trains travelling across:
1. `api-gateway` (Node.js)
2. `order-service` (Node.js)
3. `payment-api` (.NET Minimal API)
4. `postgres-db` (Datastore)
5. `kafka-broker` (Messaging Queue)

## 📡 Sending a Test Trace
You can manually send an OTLP trace via curl:

```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d @../trace-fixtures/node-express-otlp.json
```

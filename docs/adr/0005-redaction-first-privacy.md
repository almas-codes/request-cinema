# ADR 0005: Redaction-First Privacy and Data Sanitization

## Status
Accepted

## Context
Distributed traces routinely capture user emails, bearer tokens, cookies, and database query parameters containing PII or passwords. If stored or streamed, this creates serious security liabilities.

## Decision
All spans pass through pattern sanitization and allowlist filtering in `packages/otlp/src/redaction.ts` **prior** to database storage or SSE broadcast:
- Tokens, passwords, and API keys are redacted to `[REDACTED_SECRET]`.
- Emails are scrubbed to `[REDACTED_EMAIL]`.
- Credit card numbers are scrubbed to `[REDACTED_CARD]`.

## Consequences
- Guaranteed compliance with privacy standards (GDPR, SOC2, PCI-DSS).
- Safe public live demos without data leak risks.

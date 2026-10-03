import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { traceSchema } from '@request-cinema/trace-model';
import { describe, expect, it } from 'vitest';
import { decodeOtlpJson } from './decoder.js';
import {
  breakCycles,
  correctClockSkew,
  fixNegativeDurations,
  normalizeId,
  normalizeTrace,
  repairOrphans,
} from './normalizer.js';
import { isSensitiveKey, redactAttributes, scrubPrimitive } from './redaction.js';
import type { RawSpan } from './types.js';

describe('OTLP normalizer and decoder', () => {
  it('normalizes IDs from hex and base64 correctly', () => {
    expect(normalizeId('4bf92f3577b34da6a3ce929d0e0e4736')).toBe(
      '4bf92f3577b34da6a3ce929d0e0e4736',
    );
    expect(normalizeId('APkvdXezTaajzpKdDg5HNg==')).toBe('00f92f7577b34da6a3ce929d0e0e4736');
    expect(normalizeId('  00F067AA0BA902B7  ')).toBe('00f067aa0ba902b7');
  });

  it('redacts sensitive keys, tokens, emails, and card numbers', () => {
    expect(isSensitiveKey('Authorization')).toBe(true);
    expect(isSensitiveKey('api_key')).toBe(true);
    expect(isSensitiveKey('client_secret')).toBe(true);
    expect(isSensitiveKey('service.name')).toBe(false);

    const scrubbed = scrubPrimitive('Contact user john.doe@example.com for info');
    expect(scrubbed).toContain('[REDACTED_EMAIL]');

    const scrubbedCard = scrubPrimitive('Billed to card 4111 2222 3333 4444');
    expect(scrubbedCard).toContain('[REDACTED_CARD]');

    const scrubbedJwt = scrubPrimitive(
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozGz6eP9p_wVpWvP_w',
    );
    expect(scrubbedJwt).toContain('[REDACTED_JWT]');

    const redacted = redactAttributes({
      'user.email': 'alice@company.org',
      'auth.token': 'secret-bearer-123',
      'http.status_code': 200,
    });
    expect(redacted['user.email']).toBe('[REDACTED_EMAIL]');
    expect(redacted['auth.token']).toBe('[REDACTED_SECRET]');
    expect(redacted['http.status_code']).toBe(200);
  });

  it('fixes negative durations and repairs cycles and orphans', () => {
    const rawSpans: RawSpan[] = [
      {
        traceId: 'tr-001',
        spanId: 'sp-1',
        parentSpanId: null,
        name: 'RootSpan',
        startTimeUnixNano: 1000000000n,
        endTimeUnixNano: 900000000n, // Negative duration!
      },
      {
        traceId: 'tr-001',
        spanId: 'sp-2',
        parentSpanId: 'sp-missing-parent', // Orphan!
        name: 'OrphanSpan',
        startTimeUnixNano: 950000000n, // Clock skew before root!
        endTimeUnixNano: 1050000000n,
      },
    ];

    const normalized = normalizeTrace(rawSpans, 'tr-001');
    expect(normalized.spans).toHaveLength(2);
    expect(normalized.rootSpanId).toBe('sp-1');

    // Both spans have endNs > startNs
    for (const span of normalized.spans) {
      expect(span.endNs).toBeGreaterThan(span.startNs);
      expect(span.repairs.length).toBeGreaterThan(0);
    }

    // Verify valid against traceSchema
    const parsed = traceSchema.parse(normalized);
    expect(parsed.traceId).toBe('tr-001');
  });

  it('breaks recursive parent-child cycles', () => {
    const rawSpans: RawSpan[] = [
      {
        traceId: 'tr-cycle',
        spanId: 'sp-a',
        parentSpanId: 'sp-b',
        name: 'NodeA',
        startTimeUnixNano: 1000n,
        endTimeUnixNano: 2000n,
      },
      {
        traceId: 'tr-cycle',
        spanId: 'sp-b',
        parentSpanId: 'sp-a', // Cycle: A -> B -> A
        name: 'NodeB',
        startTimeUnixNano: 1000n,
        endTimeUnixNano: 2000n,
      },
    ];

    const normalized = normalizeTrace(rawSpans, 'tr-cycle');
    expect(normalized.spans.some((s) => s.repairs.some((r) => r.code === 'CYCLE_BROKEN'))).toBe(
      true,
    );
  });

  it('decodes and normalizes real SDK fixture payloads', () => {
    function getFixturePath(name: string): string {
      const candidates = [
        resolve(process.cwd(), `examples/trace-fixtures/${name}`),
        resolve(process.cwd(), `../../examples/trace-fixtures/${name}`),
      ];
      for (const c of candidates) {
        try {
          if (readFileSync(c)) return c;
        } catch {}
      }
      throw new Error(`Fixture ${name} not found`);
    }

    const fixtureNames = [
      'node-express-otlp.json',
      'dotnet-minimal-api-otlp.json',
      'go-gin-otlp.json',
    ];

    for (const name of fixtureNames) {
      const p = getFixturePath(name);
      const content = readFileSync(p, 'utf8');
      const { rawSpans, traceIds } = decodeOtlpJson(content);
      expect(rawSpans.length).toBeGreaterThan(0);
      expect(traceIds.length).toBeGreaterThan(0);

      const normalized = normalizeTrace(rawSpans, traceIds[0] ?? 'default');
      expect(normalized.spans.length).toBeGreaterThanOrEqual(rawSpans.length);
      expect(traceSchema.safeParse(normalized).success).toBe(true);
    }
  });
});

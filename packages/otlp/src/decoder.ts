import { z } from 'zod';
import type { DecoderLimits, RawSpan } from './types.js';

export const rawOtlpSchema = z.object({
  resourceSpans: z
    .array(
      z.object({
        resource: z
          .object({
            attributes: z
              .array(
                z.object({
                  key: z.string(),
                  value: z.record(z.unknown()),
                }),
              )
              .optional(),
          })
          .optional(),
        scopeSpans: z
          .array(
            z.object({
              spans: z
                .array(
                  z.object({
                    traceId: z.string(),
                    spanId: z.string(),
                    parentSpanId: z.string().optional(),
                    name: z.string(),
                    kind: z.union([z.string(), z.number()]).optional(),
                    startTimeUnixNano: z.union([z.string(), z.number()]),
                    endTimeUnixNano: z.union([z.string(), z.number()]),
                    attributes: z
                      .array(
                        z.object({
                          key: z.string(),
                          value: z.record(z.unknown()),
                        }),
                      )
                      .optional(),
                    status: z
                      .object({
                        code: z.union([z.string(), z.number()]).optional(),
                        message: z.string().optional(),
                      })
                      .optional(),
                  }),
                )
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

/**
 * Decodes an OTLP/HTTP JSON payload into a list of RawSpan objects.
 * Enforces size limits to protect against DoS attacks.
 */
export function decodeOtlpJson(
  payloadText: string,
  limits: DecoderLimits = {},
): { rawSpans: RawSpan[]; traceIds: string[] } {
  const maxBytes = limits.maxPayloadBytes ?? 10 * 1024 * 1024; // 10MB
  if (Buffer.byteLength(payloadText, 'utf8') > maxBytes) {
    throw new Error(`Payload exceeds maximum allowed size of ${maxBytes} bytes`);
  }

  const parsedJson = JSON.parse(payloadText);
  const validated = rawOtlpSchema.parse(parsedJson);

  const rawSpans: RawSpan[] = [];
  const traceIdSet = new Set<string>();
  const maxSpans = limits.maxSpans ?? 10_000;

  if (validated.resourceSpans) {
    for (const resSpan of validated.resourceSpans) {
      let serviceName = 'unknown-service';
      if (resSpan.resource?.attributes) {
        for (const attr of resSpan.resource.attributes) {
          if (attr.key === 'service.name' && typeof attr.value.stringValue === 'string') {
            serviceName = attr.value.stringValue;
            break;
          }
        }
      }

      if (resSpan.scopeSpans) {
        for (const scopeSpan of resSpan.scopeSpans) {
          if (scopeSpan.spans) {
            for (const sp of scopeSpan.spans) {
              if (rawSpans.length >= maxSpans) {
                break;
              }

              traceIdSet.add(sp.traceId);
              rawSpans.push({
                traceId: sp.traceId,
                spanId: sp.spanId,
                parentSpanId: sp.parentSpanId ?? null,
                name: sp.name,
                kind: sp.kind,
                startTimeUnixNano: sp.startTimeUnixNano,
                endTimeUnixNano: sp.endTimeUnixNano,
                serviceName,
                status: sp.status,
              });
            }
          }
        }
      }
    }
  }

  return { rawSpans, traceIds: Array.from(traceIdSet) };
}

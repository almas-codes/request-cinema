import { z } from 'zod';
import type { Span, SpanCode, SpanEvent, SpanId, SpanLink, Trace, TraceId } from './types.js';

export function asSpanId(val: string): SpanId {
  return val as SpanId;
}

export function asTraceId(val: string): TraceId {
  return val as TraceId;
}

export const spanIdSchema = z.string().min(1).transform(asSpanId) as unknown as z.ZodType<SpanId>;
export const traceIdSchema = z
  .string()
  .min(1)
  .transform(asTraceId) as unknown as z.ZodType<TraceId>;

export const attrPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);
export const attrValueSchema = z.union([attrPrimitiveSchema, z.array(attrPrimitiveSchema)]);

export const spanEventSchema: z.ZodType<SpanEvent> = z.object({
  name: z.string(),
  timeNs: z.bigint(),
  attributes: z.record(attrValueSchema).optional(),
});

export const spanLinkSchema: z.ZodType<SpanLink> = z.object({
  traceId: traceIdSchema,
  spanId: spanIdSchema,
  attributes: z.record(attrValueSchema).optional(),
});

export const spanCodeSchema: z.ZodType<SpanCode> = z.object({
  file: z.string().optional(),
  function: z.string().optional(),
  line: z.number().int().positive().optional(),
  repo: z.string().optional(),
});

export const repairNoteSchema = z.object({
  code: z.string(),
  message: z.string(),
  originalValue: z.unknown().optional(),
  repairedValue: z.unknown().optional(),
});

export const spanSchema: z.ZodType<Span> = z.object({
  traceId: traceIdSchema,
  spanId: spanIdSchema,
  parentId: spanIdSchema.nullable(),
  service: z.string(),
  name: z.string(),
  kind: z.enum(['internal', 'server', 'client', 'producer', 'consumer']),
  startNs: z.bigint(),
  endNs: z.bigint(),
  status: z.enum(['ok', 'error', 'unset']),
  attributes: z.record(attrValueSchema),
  events: z.array(spanEventSchema),
  links: z.array(spanLinkSchema),
  code: spanCodeSchema.optional(),
  repairs: z.array(repairNoteSchema),
});

export const traceSchema: z.ZodType<Trace> = z.object({
  traceId: traceIdSchema,
  spans: z.array(spanSchema),
  rootSpanId: spanIdSchema.nullable(),
  startNs: z.bigint(),
  endNs: z.bigint(),
});

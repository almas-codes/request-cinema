import {
  type AttrValue,
  type RepairNote,
  type Span,
  type SpanId,
  type SpanKind,
  type SpanStatus,
  type Trace,
  type TraceId,
  asSpanId,
  asTraceId,
} from '@request-cinema/trace-model';
import { redactAttributes } from './redaction.js';
import type { NormalizerOptions, RawSpan } from './types.js';

/**
 * Normalizes an OTLP ID (hex, base64, or binary representation) to lowercase hexadecimal.
 */
export function normalizeId(raw: string): string {
  const clean = raw.trim();
  if (!clean) {
    return 'anon-id';
  }
  // Check if it's already a valid hex string
  if (/^[0-9a-fA-F]+$/.test(clean)) {
    return clean.toLowerCase();
  }

  // Base64 decode attempt only if explicitly padded with = or contains + /
  if (clean.includes('=') || clean.includes('+') || clean.includes('/')) {
    try {
      if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
        const binary = Buffer.from(clean, 'base64');
        if (binary.length > 0) {
          return binary.toString('hex').toLowerCase();
        }
      } else if (typeof atob === 'function') {
        const raw = atob(clean);
        if (raw.length > 0) {
          let hex = '';
          for (let i = 0; i < raw.length; i++) {
            hex += raw.charCodeAt(i).toString(16).padStart(2, '0');
          }
          return hex.toLowerCase();
        }
      }
    } catch {
      // fallback
    }
  }

  return clean.toLowerCase() || 'anon-id';
}

/**
 * Maps legacy OpenTelemetry semantic conventions to current standards.
 */
export function mapSemanticConventions(
  attributes: Record<string, AttrValue>,
): Record<string, AttrValue> {
  const mapped: Record<string, AttrValue> = { ...attributes };

  // HTTP attributes
  if (
    mapped['http.status_code'] !== undefined &&
    mapped['http.response.status_code'] === undefined
  ) {
    mapped['http.response.status_code'] = mapped['http.status_code'];
  }
  if (mapped['http.method'] !== undefined && mapped['http.request.method'] === undefined) {
    mapped['http.request.method'] = mapped['http.method'];
  }
  if (mapped['http.url'] !== undefined && mapped['url.full'] === undefined) {
    mapped['url.full'] = mapped['http.url'];
  }

  // Code attributes
  if (mapped['code.filepath'] !== undefined && mapped['code.file.path'] === undefined) {
    mapped['code.file.path'] = mapped['code.filepath'];
  }
  if (mapped['code.function'] !== undefined && mapped['code.function.name'] === undefined) {
    mapped['code.function.name'] = mapped['code.function'];
  }
  if (mapped['code.lineno'] !== undefined && mapped['code.line.number'] === undefined) {
    mapped['code.line.number'] = mapped['code.lineno'];
  }

  return mapped;
}

/**
 * Fixes zero or negative durations where endNs <= startNs.
 */
export function fixNegativeDurations(
  spans: Span[],
  minDurationNs = 1_000_000n, // 1ms default minimum
): { spans: Span[]; fixedCount: number } {
  let fixedCount = 0;
  const result: Span[] = [];

  for (const span of spans) {
    if (span.endNs <= span.startNs) {
      fixedCount++;
      const repairedEndNs = span.startNs + minDurationNs;
      const note: RepairNote = {
        code: 'NEGATIVE_DURATION',
        message: `Span end timestamp (${span.endNs}) was <= start timestamp (${span.startNs}). Adjusted end to +1ms.`,
        originalValue: span.endNs.toString(),
        repairedValue: repairedEndNs.toString(),
      };
      result.push({
        ...span,
        endNs: repairedEndNs,
        repairs: [...span.repairs, note],
      });
    } else {
      result.push(span);
    }
  }

  return { spans: result, fixedCount };
}

/**
 * Breaks parent-child cycles in the span graph by severing the cyclic link.
 */
export function breakCycles(spans: Span[]): { spans: Span[]; repairedCycles: number } {
  const spanMap = new Map<SpanId, Span>(spans.map((s) => [s.spanId, s]));
  let repairedCycles = 0;
  const result: Span[] = [];

  for (const span of spans) {
    let hasCycle = false;
    let currParentId = span.parentId;
    const visited = new Set<SpanId>([span.spanId]);

    while (currParentId !== null) {
      if (visited.has(currParentId)) {
        hasCycle = true;
        break;
      }
      visited.add(currParentId);
      const parent = spanMap.get(currParentId);
      currParentId = parent ? parent.parentId : null;
    }

    if (hasCycle) {
      repairedCycles++;
      const note: RepairNote = {
        code: 'CYCLE_BROKEN',
        message: `Cyclic ancestry detected for span ${span.spanId}. Severed parent link to root.`,
        originalValue: span.parentId,
        repairedValue: null,
      };
      result.push({
        ...span,
        parentId: null,
        repairs: [...span.repairs, note],
      });
    } else {
      result.push(span);
    }
  }

  return { spans: result, repairedCycles };
}

/**
 * Repairs orphan spans whose parentId does not exist within the trace.
 * Reparents them to the legitimate root, or creates a synthetic root if none exists.
 */
export function repairOrphans(
  spans: Span[],
  traceId: TraceId,
  syntheticServiceName = 'synthetic-root',
): { spans: Span[]; rootSpanId: SpanId; repairedOrphans: number } {
  if (spans.length === 0) {
    const synId = asSpanId('syn-root-000');
    return { spans: [], rootSpanId: synId, repairedOrphans: 0 };
  }

  const spanIds = new Set<SpanId>(spans.map((s) => s.spanId));
  let root = spans.find((s) => s.parentId === null) ?? null;
  let repairedOrphans = 0;

  // If no root exists at all, create a synthetic root
  let updatedSpans = [...spans];
  if (!root) {
    let earliest = spans[0]?.startNs ?? 0n;
    let latest = spans[0]?.endNs ?? 0n;
    for (const s of spans) {
      if (s.startNs < earliest) earliest = s.startNs;
      if (s.endNs > latest) latest = s.endNs;
    }

    const syntheticRootId = asSpanId(`syn-${traceId.slice(0, 8)}`);
    const syntheticRoot: Span = {
      traceId,
      spanId: syntheticRootId,
      parentId: null,
      service: syntheticServiceName,
      name: '[Synthetic Root]',
      kind: 'server',
      startNs: earliest,
      endNs: latest > earliest ? latest : earliest + 1_000_000n,
      status: 'ok',
      attributes: { 'cinema.repair': 'synthetic_root_created' },
      events: [],
      links: [],
      repairs: [
        {
          code: 'SYNTHETIC_ROOT',
          message: 'Trace contained no root span; generated synthetic root envelope.',
        },
      ],
    };

    root = syntheticRoot;
    updatedSpans = [syntheticRoot, ...updatedSpans];
  }

  const finalSpans: Span[] = [];
  for (const span of updatedSpans) {
    if (span.parentId !== null && !spanIds.has(span.parentId) && span.spanId !== root.spanId) {
      repairedOrphans++;
      const note: RepairNote = {
        code: 'ORPHAN_REPAIRED',
        message: `Parent span ${span.parentId} missing from trace. Re-parented to root ${root.spanId}.`,
        originalValue: span.parentId,
        repairedValue: root.spanId,
      };
      finalSpans.push({
        ...span,
        parentId: root.spanId,
        repairs: [...span.repairs, note],
      });
    } else {
      finalSpans.push(span);
    }
  }

  return { spans: finalSpans, rootSpanId: root.spanId, repairedOrphans };
}

/**
 * Corrects clock skew: a child span cannot start before its parent starts.
 */
export function correctClockSkew(spans: Span[]): { spans: Span[]; skewedCount: number } {
  const spanMap = new Map<SpanId, Span>(spans.map((s) => [s.spanId, s]));
  let skewedCount = 0;
  const result: Span[] = [];

  for (const span of spans) {
    if (span.parentId !== null) {
      const parent = spanMap.get(span.parentId);
      if (parent && span.startNs < parent.startNs) {
        skewedCount++;
        const duration = span.endNs - span.startNs;
        const adjustedStart = parent.startNs;
        const adjustedEnd = adjustedStart + (duration > 0n ? duration : 1_000_000n);

        const note: RepairNote = {
          code: 'CLOCK_SKEW_CORRECTED',
          message: `Child span started at ${span.startNs}, before parent ${parent.spanId} started at ${parent.startNs}. Aligned child to parent start.`,
          originalValue: span.startNs.toString(),
          repairedValue: adjustedStart.toString(),
        };

        result.push({
          ...span,
          startNs: adjustedStart,
          endNs: adjustedEnd,
          repairs: [...span.repairs, note],
        });
        continue;
      }
    }
    result.push(span);
  }

  return { spans: result, skewedCount };
}

/**
 * Full normalizer pipeline: takes raw spans and yields a pristine normalized Trace.
 */
export function normalizeTrace(
  rawSpans: RawSpan[],
  traceIdInput: string,
  options: NormalizerOptions = {},
): Trace {
  const normTraceId = normalizeId(traceIdInput);
  const traceId = asTraceId(normTraceId === 'anon-id' ? 'anon-trace-001' : normTraceId);

  // Convert raw spans into initial typed spans
  const initialSpans: Span[] = rawSpans.map((raw, idx) => {
    const normSpanId = normalizeId(raw.spanId);
    const spanId = asSpanId(normSpanId === 'anon-id' ? `anon-span-${idx + 1}` : normSpanId);
    const parentId = raw.parentSpanId ? asSpanId(normalizeId(raw.parentSpanId)) : null;

    let startNs: bigint;
    try {
      startNs = BigInt(raw.startTimeUnixNano);
    } catch {
      startNs = 0n;
    }

    let endNs: bigint;
    try {
      endNs = BigInt(raw.endTimeUnixNano);
    } catch {
      endNs = startNs + 1_000_000n;
    }

    // Convert raw attributes
    const rawAttrs: Record<string, AttrValue> = {};
    if (raw.attributes) {
      if (Array.isArray(raw.attributes)) {
        for (const kv of raw.attributes) {
          if (kv.value.stringValue !== undefined) rawAttrs[kv.key] = kv.value.stringValue;
          else if (kv.value.intValue !== undefined) rawAttrs[kv.key] = Number(kv.value.intValue);
          else if (kv.value.boolValue !== undefined) rawAttrs[kv.key] = kv.value.boolValue;
        }
      } else {
        Object.assign(rawAttrs, raw.attributes);
      }
    }

    const redacted = redactAttributes(mapSemanticConventions(rawAttrs));

    let kind: SpanKind = 'internal';
    const kindStr = String(raw.kind || '').toLowerCase();
    if (kindStr.includes('server') || kindStr === '2') kind = 'server';
    else if (kindStr.includes('client') || kindStr === '3') kind = 'client';
    else if (kindStr.includes('producer') || kindStr === '4') kind = 'producer';
    else if (kindStr.includes('consumer') || kindStr === '5') kind = 'consumer';

    let status: SpanStatus = 'ok';
    const statusCode = String(raw.status?.code || '').toLowerCase();
    if (statusCode === '2' || statusCode.includes('error')) {
      status = 'error';
    }

    return {
      traceId,
      spanId,
      parentId,
      service: raw.serviceName || (rawAttrs['service.name'] as string) || 'unknown-service',
      name: raw.name || 'unnamed-operation',
      kind,
      startNs,
      endNs,
      status,
      attributes: redacted,
      events: [],
      links: [],
      repairs: [],
    };
  });

  // Pipeline passes
  const withDurations = fixNegativeDurations(initialSpans, options.minSpanDurationNs).spans;
  const withoutCycles = breakCycles(withDurations).spans;
  const withoutOrphans = repairOrphans(withoutCycles, traceId, options.syntheticRootServiceName);
  const skewCorrected = correctClockSkew(withoutOrphans.spans).spans;

  let minStartNs = skewCorrected[0]?.startNs ?? 0n;
  let maxEndNs = skewCorrected[0]?.endNs ?? 0n;
  for (const s of skewCorrected) {
    if (s.startNs < minStartNs) minStartNs = s.startNs;
    if (s.endNs > maxEndNs) maxEndNs = s.endNs;
  }

  return {
    traceId,
    spans: skewCorrected,
    rootSpanId: withoutOrphans.rootSpanId,
    startNs: minStartNs,
    endNs: maxEndNs,
  };
}

import type { AttrValue, SpanKind, SpanStatus } from '@request-cinema/trace-model';

export interface RawSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string | null | undefined;
  name: string;
  kind?: string | number | undefined;
  startTimeUnixNano: string | number | bigint;
  endTimeUnixNano: string | number | bigint;
  attributes?: Record<string, AttrValue> | RawKeyValue[] | undefined;
  events?:
    | Array<{
        name: string;
        timeUnixNano: string | number | bigint;
        attributes?: Record<string, AttrValue> | RawKeyValue[];
      }>
    | undefined;
  status?: { code?: string | number | undefined; message?: string | undefined } | undefined;
  serviceName?: string | undefined;
}

export interface RawKeyValue {
  key: string;
  value: {
    stringValue?: string | undefined;
    intValue?: string | number | undefined;
    boolValue?: boolean | undefined;
    arrayValue?:
      | {
          values?: Array<{ stringValue?: string; intValue?: string | number; boolValue?: boolean }>;
        }
      | undefined;
  };
}

export interface DecoderLimits {
  maxPayloadBytes?: number | undefined; // default: 10MB
  maxSpans?: number | undefined; // default: 10,000
  maxAttributeCount?: number | undefined; // default: 128
  maxAttributeLength?: number | undefined; // default: 4,096
}

export interface NormalizerOptions {
  syntheticRootServiceName?: string | undefined;
  minSpanDurationNs?: bigint | undefined; // default: 1ms (1_000_000n)
}

import {
  type AttrValue,
  type Span,
  type SpanId,
  type SpanKind,
  type Trace,
  type TraceId,
  asSpanId,
  asTraceId,
} from '@request-cinema/trace-model';
import { SeededRng } from './rng.js';

export interface GeneratorOptions {
  seed?: number | undefined;
  spanCount?: number | undefined;
  depth?: number | undefined;
  fanOut?: number | undefined;
  errorRate?: number | undefined;
  skewMs?: number | undefined;
  orphanRate?: number | undefined;
  cycleRate?: number | undefined;
  negativeDurationRate?: number | undefined;
  hugeAttributes?: boolean | undefined;
  baseTimeNs?: bigint | undefined;
}

const DEFAULT_SERVICES = [
  'api-gateway',
  'auth-service',
  'order-service',
  'payment-service',
  'inventory-service',
  'notification-worker',
  'postgres-db',
  'redis-cache',
  'kafka-broker',
];

const DEFAULT_OPERATIONS = [
  'HTTP GET /checkout',
  'POST /api/v1/orders',
  'SELECT FROM orders WHERE id = ?',
  'SET redis:session:',
  'RPC VerifyCard',
  'PUBLISH order.created',
  'CONSUME order.created',
  'SendReceiptEmail',
];

export function generateTrace(options: GeneratorOptions = {}): Trace {
  const seed = options.seed ?? 42;
  const rng = new SeededRng(seed);
  const targetCount = Math.max(1, options.spanCount ?? 10);
  const depthLimit = options.depth ?? 4;
  const fanOutLimit = options.fanOut ?? 3;
  const errorRate = options.errorRate ?? 0.1;
  const skewMs = options.skewMs ?? 0;
  const orphanRate = options.orphanRate ?? 0;
  const cycleRate = options.cycleRate ?? 0;
  const negativeDurationRate = options.negativeDurationRate ?? 0;
  const hugeAttributes = options.hugeAttributes ?? false;
  const baseTimeNs = options.baseTimeNs ?? 1_700_000_000_000_000_000n;

  const traceId: TraceId = asTraceId(`tr-${seed.toString(16).padStart(8, '0')}`);
  const spans: Span[] = [];

  // Create root span
  const rootId: SpanId = asSpanId('span-0001');
  const rootDurationNs = BigInt(rng.nextInt(50, 200)) * 1_000_000n;

  const rootSpan: Span = {
    traceId,
    spanId: rootId,
    parentId: null,
    service: 'api-gateway',
    name: 'GET /api/entrypoint',
    kind: 'server',
    startNs: baseTimeNs,
    endNs: baseTimeNs + rootDurationNs,
    status: rng.nextBool(errorRate) ? 'error' : 'ok',
    attributes: generateAttributes(rng, hugeAttributes),
    events: [],
    links: [],
    repairs: [],
  };
  spans.push(rootSpan);

  const kinds: SpanKind[] = ['internal', 'server', 'client', 'producer', 'consumer'];

  interface NodeContext {
    id: SpanId;
    currentDepth: number;
    startNs: bigint;
    endNs: bigint;
  }

  const queue: NodeContext[] = [
    { id: rootId, currentDepth: 0, startNs: rootSpan.startNs, endNs: rootSpan.endNs },
  ];

  let idCounter = 2;

  while (queue.length > 0 && spans.length < targetCount) {
    const parent = queue.shift();
    if (!parent) {
      break;
    }

    if (parent.currentDepth >= depthLimit) {
      continue;
    }

    const branches = Math.min(fanOutLimit, targetCount - spans.length);
    const parentDuration = parent.endNs - parent.startNs;

    for (let i = 0; i < branches && spans.length < targetCount; i++) {
      const spanId = asSpanId(`span-${idCounter.toString().padStart(4, '0')}`);
      idCounter++;

      const isOrphan = rng.nextBool(orphanRate);
      const isCycle = rng.nextBool(cycleRate);
      const hasNegativeDuration = rng.nextBool(negativeDurationRate);

      let parentId: SpanId | null = parent.id;
      if (isOrphan) {
        parentId = asSpanId(`missing-parent-${rng.nextInt(100, 999)}`);
      } else if (isCycle) {
        parentId = spanId; // Points to itself to form a cycle!
      }

      // Span timing relative to parent
      const offsetRatio = rng.next() * 0.5;
      const durationRatio = 0.1 + rng.next() * 0.4;

      let childStartNs = parent.startNs + BigInt(Math.floor(Number(parentDuration) * offsetRatio));
      if (skewMs !== 0) {
        // Clock skew injection: starts before parent!
        childStartNs -= BigInt(skewMs) * 1_000_000n;
      }

      let childDurationNs = BigInt(Math.floor(Number(parentDuration) * durationRatio));
      if (hasNegativeDuration) {
        childDurationNs = -50_000_000n; // Negative duration anomaly
      }

      const childEndNs = childStartNs + childDurationNs;

      const span: Span = {
        traceId,
        spanId,
        parentId,
        service: rng.pick(DEFAULT_SERVICES),
        name: rng.pick(DEFAULT_OPERATIONS),
        kind: rng.pick(kinds),
        startNs: childStartNs,
        endNs: childEndNs,
        status: rng.nextBool(errorRate) ? 'error' : 'ok',
        attributes: generateAttributes(rng, hugeAttributes),
        events: [],
        links: [],
        repairs: [],
      };

      spans.push(span);
      queue.push({
        id: spanId,
        currentDepth: parent.currentDepth + 1,
        startNs: childStartNs,
        endNs: childEndNs,
      });
    }
  }

  // Calculate overall trace boundary
  let startNs = spans[0]?.startNs ?? baseTimeNs;
  let endNs = spans[0]?.endNs ?? baseTimeNs;

  for (const s of spans) {
    if (s.startNs < startNs) {
      startNs = s.startNs;
    }
    if (s.endNs > endNs) {
      endNs = s.endNs;
    }
  }

  return {
    traceId,
    spans,
    rootSpanId: rootId,
    startNs,
    endNs,
  };
}

function generateAttributes(rng: SeededRng, huge: boolean): Record<string, AttrValue> {
  const count = huge ? 50 : rng.nextInt(2, 6);
  const attrs: Record<string, AttrValue> = {
    'service.version': '1.2.0',
    'host.name': `node-${rng.nextInt(1, 5)}.cluster.local`,
  };

  for (let i = 0; i < count; i++) {
    const key = `custom.metric.${i}`;
    if (rng.nextBool(0.3)) {
      attrs[key] = rng.nextInt(10, 5000);
    } else if (rng.nextBool(0.5)) {
      attrs[key] = rng.nextBool();
    } else {
      attrs[key] = `val_${rng.nextInt(1000, 9999)}`;
    }
  }

  return attrs;
}

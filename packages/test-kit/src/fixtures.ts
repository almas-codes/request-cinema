import { type Span, type Trace, asSpanId, asTraceId } from '@request-cinema/trace-model';

const BASE_TIME = 1_700_000_000_000_000_000n;
const MS = 1_000_000n;

/**
 * Realistic E-Commerce Checkout Trace:
 * API Gateway -> Auth Check -> Order Service (Postgres INSERT, Kafka Emit) -> Stripe Payment Client -> Kafka Fulfillment Worker
 */
export function shopCheckoutFixture(): Trace {
  const traceId = asTraceId('tr-shop-checkout-001');
  const sGateway = asSpanId('sp-gateway');
  const sAuth = asSpanId('sp-auth');
  const sOrder = asSpanId('sp-order');
  const sDb = asSpanId('sp-postgres-insert');
  const sKafkaPub = asSpanId('sp-kafka-produce');
  const sPayment = asSpanId('sp-payment');
  const sStripe = asSpanId('sp-stripe-http');
  const sKafkaSub = asSpanId('sp-kafka-consume');

  const spans: Span[] = [
    {
      traceId,
      spanId: sGateway,
      parentId: null,
      service: 'api-gateway',
      name: 'POST /v1/checkout',
      kind: 'server',
      startNs: BASE_TIME,
      endNs: BASE_TIME + 250n * MS,
      status: 'ok',
      attributes: {
        'http.method': 'POST',
        'http.route': '/v1/checkout',
        'http.status_code': 200,
        'user.id': 'usr_94827',
      },
      events: [{ name: 'request_headers_parsed', timeNs: BASE_TIME + 2n * MS }],
      links: [],
      code: { file: 'src/routes/checkout.ts', function: 'handleCheckout', line: 42 },
      repairs: [],
    },
    {
      traceId,
      spanId: sAuth,
      parentId: sGateway,
      service: 'auth-service',
      name: 'RPC ValidateSession',
      kind: 'server',
      startNs: BASE_TIME + 5n * MS,
      endNs: BASE_TIME + 25n * MS,
      status: 'ok',
      attributes: { 'rpc.system': 'grpc', 'auth.type': 'jwt' },
      events: [],
      links: [],
      code: { file: 'services/auth/session.go', function: 'ValidateToken', line: 88 },
      repairs: [],
    },
    {
      traceId,
      spanId: sOrder,
      parentId: sGateway,
      service: 'order-service',
      name: 'CreateOrder',
      kind: 'internal',
      startNs: BASE_TIME + 30n * MS,
      endNs: BASE_TIME + 240n * MS,
      status: 'ok',
      attributes: { 'order.id': 'ord_83921', 'order.total_usd': 149.99 },
      events: [],
      links: [],
      code: { file: 'src/domain/orders.ts', function: 'createOrder', line: 110 },
      repairs: [],
    },
    {
      traceId,
      spanId: sDb,
      parentId: sOrder,
      service: 'postgres-db',
      name: 'INSERT INTO orders',
      kind: 'client',
      startNs: BASE_TIME + 35n * MS,
      endNs: BASE_TIME + 95n * MS, // 60ms DB insert
      status: 'ok',
      attributes: {
        'db.system': 'postgresql',
        'db.statement': 'INSERT INTO orders (id, user_id, amount) VALUES ($1, $2, $3)',
        'db.operation': 'INSERT',
      },
      events: [],
      links: [],
      repairs: [],
    },
    {
      traceId,
      spanId: sPayment,
      parentId: sOrder,
      service: 'payment-service',
      name: 'ProcessPayment',
      kind: 'internal',
      startNs: BASE_TIME + 100n * MS,
      endNs: BASE_TIME + 210n * MS,
      status: 'ok',
      attributes: { 'payment.provider': 'stripe' },
      events: [],
      links: [],
      code: { file: 'src/payment/processor.ts', function: 'charge', line: 65 },
      repairs: [],
    },
    {
      traceId,
      spanId: sStripe,
      parentId: sPayment,
      service: 'payment-service',
      name: 'HTTPS POST api.stripe.com/v1/charges',
      kind: 'client',
      startNs: BASE_TIME + 105n * MS,
      endNs: BASE_TIME + 205n * MS, // 100ms external network call
      status: 'ok',
      attributes: { 'http.url': 'https://api.stripe.com/v1/charges', 'http.status_code': 200 },
      events: [],
      links: [],
      repairs: [],
    },
    {
      traceId,
      spanId: sKafkaPub,
      parentId: sOrder,
      service: 'kafka-broker',
      name: 'PUBLISH orders.created',
      kind: 'producer',
      startNs: BASE_TIME + 215n * MS,
      endNs: BASE_TIME + 235n * MS,
      status: 'ok',
      attributes: { 'messaging.system': 'kafka', 'messaging.destination': 'orders.created' },
      events: [],
      links: [],
      repairs: [],
    },
    {
      traceId,
      spanId: sKafkaSub,
      parentId: sKafkaPub,
      service: 'fulfillment-worker',
      name: 'CONSUME orders.created',
      kind: 'consumer',
      startNs: BASE_TIME + 245n * MS,
      endNs: BASE_TIME + 320n * MS,
      status: 'ok',
      attributes: { 'messaging.system': 'kafka', 'worker.concurrency': 4 },
      events: [],
      links: [],
      code: { file: 'workers/fulfillment.py', function: 'on_order_created', line: 34 },
      repairs: [],
    },
  ];

  return {
    traceId,
    spans,
    rootSpanId: sGateway,
    startNs: BASE_TIME,
    endNs: BASE_TIME + 320n * MS,
  };
}

/**
 * Fan-Out Search Trace:
 * API Query -> 4 Shard queries in parallel -> Merge results
 */
export function fanOutSearchFixture(): Trace {
  const traceId = asTraceId('tr-fanout-search-002');
  const sRoot = asSpanId('sp-search-root');
  const sShard1 = asSpanId('sp-shard-1');
  const sShard2 = asSpanId('sp-shard-2');
  const sShard3 = asSpanId('sp-shard-3');
  const sShard4 = asSpanId('sp-shard-4');
  const sMerge = asSpanId('sp-merge');

  const spans: Span[] = [
    {
      traceId,
      spanId: sRoot,
      parentId: null,
      service: 'search-api',
      name: 'GET /v2/search?q=wireless+headphones',
      kind: 'server',
      startNs: BASE_TIME,
      endNs: BASE_TIME + 120n * MS,
      status: 'ok',
      attributes: { 'search.query': 'wireless headphones', 'search.hits': 42 },
      events: [],
      links: [],
      code: { file: 'src/search.ts', function: 'executeSearch', line: 15 },
      repairs: [],
    },
    {
      traceId,
      spanId: sShard1,
      parentId: sRoot,
      service: 'search-shard-east',
      name: 'QueryIndexShardEast',
      kind: 'client',
      startNs: BASE_TIME + 10n * MS,
      endNs: BASE_TIME + 75n * MS,
      status: 'ok',
      attributes: { 'shard.id': 'east-1', 'shard.docs_scanned': 15000 },
      events: [],
      links: [],
      repairs: [],
    },
    {
      traceId,
      spanId: sShard2,
      parentId: sRoot,
      service: 'search-shard-west',
      name: 'QueryIndexShardWest',
      kind: 'client',
      startNs: BASE_TIME + 10n * MS,
      endNs: BASE_TIME + 90n * MS, // Slowest shard
      status: 'ok',
      attributes: { 'shard.id': 'west-1', 'shard.docs_scanned': 22000 },
      events: [],
      links: [],
      repairs: [],
    },
    {
      traceId,
      spanId: sShard3,
      parentId: sRoot,
      service: 'search-shard-eu',
      name: 'QueryIndexShardEU',
      kind: 'client',
      startNs: BASE_TIME + 12n * MS,
      endNs: BASE_TIME + 65n * MS,
      status: 'ok',
      attributes: { 'shard.id': 'eu-1' },
      events: [],
      links: [],
      repairs: [],
    },
    {
      traceId,
      spanId: sShard4,
      parentId: sRoot,
      service: 'search-shard-apac',
      name: 'QueryIndexShardAPAC',
      kind: 'client',
      startNs: BASE_TIME + 12n * MS,
      endNs: BASE_TIME + 80n * MS,
      status: 'ok',
      attributes: { 'shard.id': 'apac-1' },
      events: [],
      links: [],
      repairs: [],
    },
    {
      traceId,
      spanId: sMerge,
      parentId: sRoot,
      service: 'search-api',
      name: 'RankAndMergeResults',
      kind: 'internal',
      startNs: BASE_TIME + 95n * MS,
      endNs: BASE_TIME + 115n * MS,
      status: 'ok',
      attributes: { 'ranking.algorithm': 'bm25+vector' },
      events: [],
      links: [],
      repairs: [],
    },
  ];

  return {
    traceId,
    spans,
    rootSpanId: sRoot,
    startNs: BASE_TIME,
    endNs: BASE_TIME + 120n * MS,
  };
}

/**
 * Retry Storm Fixture:
 * Service encounters downstream network failure and executes 3 exponential backoff retries.
 */
export function retryStormFixture(): Trace {
  const traceId = asTraceId('tr-retry-storm-003');
  const sRoot = asSpanId('sp-sync-root');
  const sAttempt1 = asSpanId('sp-attempt-1');
  const sAttempt2 = asSpanId('sp-attempt-2');
  const sAttempt3 = asSpanId('sp-attempt-3');

  const spans: Span[] = [
    {
      traceId,
      spanId: sRoot,
      parentId: null,
      service: 'inventory-service',
      name: 'ReserveStock',
      kind: 'server',
      startNs: BASE_TIME,
      endNs: BASE_TIME + 500n * MS,
      status: 'error',
      attributes: { 'error.type': 'MaxRetriesExceeded', 'retry.count': 3 },
      events: [{ name: 'retry_exhausted', timeNs: BASE_TIME + 490n * MS }],
      links: [],
      code: { file: 'src/inventory/stock.ts', function: 'reserve', line: 55 },
      repairs: [],
    },
    {
      traceId,
      spanId: sAttempt1,
      parentId: sRoot,
      service: 'postgres-db',
      name: 'UPDATE inventory (Attempt 1)',
      kind: 'client',
      startNs: BASE_TIME + 10n * MS,
      endNs: BASE_TIME + 110n * MS,
      status: 'error',
      attributes: { 'db.statement': 'UPDATE stock WHERE sku = $1', error: 'ConnectionTimeout' },
      events: [],
      links: [],
      repairs: [],
    },
    {
      traceId,
      spanId: sAttempt2,
      parentId: sRoot,
      service: 'postgres-db',
      name: 'UPDATE inventory (Attempt 2)',
      kind: 'client',
      startNs: BASE_TIME + 160n * MS,
      endNs: BASE_TIME + 260n * MS,
      status: 'error',
      attributes: { 'db.statement': 'UPDATE stock WHERE sku = $1', error: 'ConnectionTimeout' },
      events: [],
      links: [],
      repairs: [],
    },
    {
      traceId,
      spanId: sAttempt3,
      parentId: sRoot,
      service: 'postgres-db',
      name: 'UPDATE inventory (Attempt 3)',
      kind: 'client',
      startNs: BASE_TIME + 360n * MS,
      endNs: BASE_TIME + 460n * MS,
      status: 'error',
      attributes: { 'db.statement': 'UPDATE stock WHERE sku = $1', error: 'ConnectionRefused' },
      events: [],
      links: [],
      repairs: [],
    },
  ];

  return {
    traceId,
    spans,
    rootSpanId: sRoot,
    startNs: BASE_TIME,
    endNs: BASE_TIME + 500n * MS,
  };
}

/**
 * Queue Consumer Trace:
 * Asynchronous job processing decoupled from the web thread.
 */
export function queueConsumerFixture(): Trace {
  const traceId = asTraceId('tr-queue-consumer-004');
  const sRoot = asSpanId('sp-consume-message');
  const sS3 = asSpanId('sp-s3-upload');

  const spans: Span[] = [
    {
      traceId,
      spanId: sRoot,
      parentId: null,
      service: 'image-transcoder',
      name: 'CONSUME video.upload.jobs',
      kind: 'consumer',
      startNs: BASE_TIME,
      endNs: BASE_TIME + 450n * MS,
      status: 'ok',
      attributes: { 'media.codec': 'h264', 'media.duration_sec': 120 },
      events: [],
      links: [],
      code: { file: 'workers/transcoder.py', function: 'process_video', line: 99 },
      repairs: [],
    },
    {
      traceId,
      spanId: sS3,
      parentId: sRoot,
      service: 'aws-s3',
      name: 'S3 PutObject output.mp4',
      kind: 'client',
      startNs: BASE_TIME + 350n * MS,
      endNs: BASE_TIME + 440n * MS,
      status: 'ok',
      attributes: { 's3.bucket': 'assets-production', 's3.key': 'thumbnails/output.mp4' },
      events: [],
      links: [],
      repairs: [],
    },
  ];

  return {
    traceId,
    spans,
    rootSpanId: sRoot,
    startNs: BASE_TIME,
    endNs: BASE_TIME + 450n * MS,
  };
}

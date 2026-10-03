import { type Span, asSpanId, asTraceId } from '@request-cinema/trace-model';
import { describe, expect, it } from 'vitest';
import { isSafePath, resolveSpanToCode } from './source-resolver.js';

describe('source-resolver ladder and security', () => {
  const allowedRoots = ['/app/src', 'src'];

  it('rejects path traversal attempts', () => {
    expect(isSafePath('../etc/passwd', allowedRoots)).toBe(false);
    expect(isSafePath('../../secrets.env', allowedRoots)).toBe(false);
    expect(isSafePath('src/main.ts', allowedRoots)).toBe(true);
  });

  it('resolves via explicit attributes', () => {
    const span: Span = {
      traceId: asTraceId('tr-1'),
      spanId: asSpanId('sp-1'),
      parentId: null,
      service: 'web',
      name: 'Handler',
      kind: 'server',
      startNs: 0n,
      endNs: 100n,
      status: 'ok',
      attributes: {
        'code.file.path': 'src/main.ts',
        'code.function.name': 'handleCheckout',
        'code.line.number': 42,
      },
      events: [],
      links: [],
      repairs: [],
    };

    const res = resolveSpanToCode(span, { sourceRoots: allowedRoots });
    expect(res.resolvedVia).toBe('explicit_attr');
    expect(res.file).toBe('src/main.ts');
    expect(res.function).toBe('handleCheckout');
    expect(res.line).toBe(42);
  });

  it('resolves via exception stack trace', () => {
    const span: Span = {
      traceId: asTraceId('tr-2'),
      spanId: asSpanId('sp-2'),
      parentId: null,
      service: 'web',
      name: 'FailingOp',
      kind: 'server',
      startNs: 0n,
      endNs: 100n,
      status: 'error',
      attributes: {},
      events: [
        {
          name: 'exception',
          timeNs: 50n,
          attributes: {
            'exception.stacktrace': 'Error: Failed\n    at handleRequest (src/server.ts:88:12)',
          },
        },
      ],
      links: [],
      repairs: [],
    };

    const res = resolveSpanToCode(span, { sourceRoots: allowedRoots });
    expect(res.resolvedVia).toBe('stack_trace');
    expect(res.file).toBe('src/server.ts');
    expect(res.line).toBe(88);
  });

  it('resolves via name heuristic', () => {
    const span: Span = {
      traceId: asTraceId('tr-3'),
      spanId: asSpanId('sp-3'),
      parentId: null,
      service: 'web',
      name: 'PaymentProcessor.chargeCard',
      kind: 'internal',
      startNs: 0n,
      endNs: 100n,
      status: 'ok',
      attributes: {},
      events: [],
      links: [],
      repairs: [],
    };

    const res = resolveSpanToCode(span, { sourceRoots: allowedRoots });
    expect(res.resolvedVia).toBe('name_heuristic');
    expect(res.function).toBe('chargeCard');
  });

  it('returns unresolved when no mapping matches', () => {
    const span: Span = {
      traceId: asTraceId('tr-4'),
      spanId: asSpanId('sp-4'),
      parentId: null,
      service: 'web',
      name: 'generic-step',
      kind: 'internal',
      startNs: 0n,
      endNs: 100n,
      status: 'ok',
      attributes: {},
      events: [],
      links: [],
      repairs: [],
    };

    const res = resolveSpanToCode(span, { sourceRoots: allowedRoots });
    expect(res.resolvedVia).toBe('unresolved');
  });
});

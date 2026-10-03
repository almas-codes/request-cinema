import { describe, expect, it } from 'vitest';
import { initCinema } from './init.js';
import { CodeSpanProcessor, extractCallStack } from './span-processor.js';

describe('sdk-node instrumentation helper', () => {
  it('extractCallStack returns file, func, and line when available', () => {
    function testFunction() {
      return extractCallStack();
    }
    const stack = testFunction();
    expect(stack).not.toBeNull();
    expect(stack?.file).toBeDefined();
  });

  it('CodeSpanProcessor enriches span with code.* attributes', () => {
    const processor = new CodeSpanProcessor(true);
    const attrs: Record<string, string | number> = {};
    const mockSpan = {
      setAttribute: (k: string, v: string | number) => {
        attrs[k] = v;
      },
    };

    processor.onStart(mockSpan);
    expect(attrs['code.file.path']).toBeDefined();
    expect(attrs['code.line.number']).toBeDefined();
  });

  it('initCinema returns shutdown and processor', async () => {
    const cinema = initCinema({ serviceName: 'test-service' });
    expect(cinema.processor).toBeDefined();
    await cinema.shutdown();
  });
});

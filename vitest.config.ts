import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'packages/trace-model/src/**/*.ts',
        'packages/otlp/src/**/*.ts',
        'packages/cinema-engine/src/**/*.ts',
        'packages/sdk-node/src/**/*.ts',
        'packages/store/src/**/*.ts',
        'packages/test-kit/src/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/types.ts',
        '**/index.ts',
        '**/renderer.ts',
        '**/adapter.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 75,
        statements: 80,
      },
    },
  },
});

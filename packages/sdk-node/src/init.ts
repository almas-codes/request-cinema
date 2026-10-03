import { CodeSpanProcessor } from './span-processor.js';

export interface CinemaConfig {
  serviceName: string;
  endpoint?: string | undefined; // default: http://localhost:4318/v1/traces
  sampleCodeAttributes?: boolean | undefined;
}

export function initCinema(config: CinemaConfig): {
  shutdown: () => Promise<void>;
  processor: CodeSpanProcessor;
} {
  const processor = new CodeSpanProcessor(config.sampleCodeAttributes ?? true);

  return {
    processor,
    shutdown: async () => {
      // Clean shutdown hook
    },
  };
}

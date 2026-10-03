import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  OTLP_PORT: z.coerce.number().default(4318),
  STORAGE_TYPE: z.enum(['sqlite', 'memory']).default('sqlite'),
  SQLITE_PATH: z.string().default(':memory:'),
  SOURCE_ROOT: z.string().default('.'),
  API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadConfig(rawEnv: Record<string, string | undefined> = process.env): EnvConfig {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    console.error('Invalid server configuration:', parsed.error.format());
    throw new Error('Failed to load valid server configuration');
  }
  return parsed.data;
}

import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

for (const candidate of [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(__dirname, '../../.env')
]) {
  dotenv.config({ path: candidate });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4001),
  SERVER_PORT: z.coerce.number().int().positive().default(4001),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32).default('dev_jwt_secret_for_local_testing_only_1234567890'),
  CORS_ORIGIN: z.string().default('http://localhost:3007'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_ANON_KEY: z.string().optional().or(z.literal('')),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal('')),
  SUPABASE_JWT_SECRET: z.string().optional().or(z.literal(''))
});

export const config = envSchema.parse(process.env);

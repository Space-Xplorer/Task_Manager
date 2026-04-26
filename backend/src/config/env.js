import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(10, 'JWT_ACCESS_SECRET too short'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET too short'),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  SEED_ADMIN_NAME: z.string().default('Admin'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@taskmanager.com'),
  SEED_ADMIN_PASSWORD: z.string().min(6).default('Admin@123'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

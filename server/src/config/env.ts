import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve .env relative to this file (compiled to server/dist/config/env.js),
// not the process's working directory — the deploy start command may be run
// from the project root, not from server/. On real hosts this is a no-op
// (no .env file ships there; env vars come from the platform directly) and
// harmlessly does nothing if the file is missing.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  mongodbUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
};

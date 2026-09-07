import { Redis } from '@upstash/redis';
import fs from 'node:fs';
import path from 'node:path';

let client;

// Support both the KV_REST_API_* and UPSTASH_REDIS_REST_* env var names,
// since the exact names Vercel injects depend on the integration version.
export function getRedis() {
  if (client) return client;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  client = (url && token) ? new Redis({ url, token }) : createLocalFileStore();
  return client;
}

// Local-only stand-in for Redis, used when no Upstash credentials are
// configured (e.g. testing on a machine before connecting the real
// integration). Never used in production -- Vercel always has the real
// KV_REST_API_*/UPSTASH_REDIS_REST_* vars set once Upstash is connected.
function createLocalFileStore() {
  const dir = path.resolve(process.cwd(), '.local-data');
  const file = path.join(dir, 'store.json');
  console.warn('[lib/redis] No Upstash env vars found -- using a local JSON file store for development only.');

  function readAll() {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return {};
    }
  }

  function writeAll(data) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data), 'utf8');
  }

  return {
    async get(key) {
      const data = readAll();
      return key in data ? data[key] : null;
    },
    async set(key, value) {
      const data = readAll();
      data[key] = value;
      writeAll(data);
      return 'OK';
    },
    async del(key) {
      const data = readAll();
      const existed = key in data;
      delete data[key];
      writeAll(data);
      return existed ? 1 : 0;
    },
  };
}

export const MENU_KEY = 'menu:v1';

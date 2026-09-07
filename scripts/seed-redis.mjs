/* ============================================================
   scripts/seed-redis.mjs
   Loads menu-seed.json (the checked-in initial menu data,
   extracted once from the original hardcoded HTML pages) and
   writes it into Redis as the menu:v1 key. Safe to re-run --
   each run just overwrites menu:v1 with the seed file's content
   and a fresh updatedAt, so re-running it after someone has made
   admin edits will revert those edits back to the seed. Run via
   `npm run seed` once after connecting Upstash + setting env vars,
   or again if you ever need to reset the menu back to this
   checked-in baseline.
   ============================================================ */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRedis, MENU_KEY } from '../lib/redis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function main() {
  const raw = await fs.readFile(path.join(root, 'menu-seed.json'), 'utf8');
  const data = JSON.parse(raw);
  data.updatedAt = new Date().toISOString();

  const itemCount = Object.values(data.categories).reduce((n, c) => n + c.items.length, 0);
  console.log(`Seeding ${itemCount} items across ${Object.keys(data.categories).length} categories...`);

  const redis = getRedis();
  await redis.set(MENU_KEY, data);
  console.log(`Seeded Redis key "${MENU_KEY}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

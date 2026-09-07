import { getRedis, MENU_KEY } from '../lib/redis.js';

// Public read endpoint -- the menu is already visible to anyone via
// view-source today, so no auth is needed here. Only writes are gated.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const redis = getRedis();
  const data = await redis.get(MENU_KEY);

  if (!data) {
    res.status(503).json({ error: 'Menu not seeded yet' });
    return;
  }

  // No edge/CDN caching -- admin edits must show up immediately, not
  // after a stale-while-revalidate window. This site is low-traffic
  // enough that correctness matters more than shaving off requests.
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(data);
}

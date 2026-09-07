import { getRedis, MENU_KEY } from '../../lib/redis.js';
import { isAuthenticated } from '../../lib/session.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const redis = getRedis();

  if (req.method === 'GET') {
    const data = await redis.get(MENU_KEY);
    res.status(200).json(data || null);
    return;
  }

  if (req.method === 'PATCH') {
    const { categorySlug, itemId, changes } = req.body || {};

    if (typeof categorySlug !== 'string' || typeof itemId !== 'string' || !changes || typeof changes !== 'object') {
      res.status(400).json({ error: 'categorySlug, itemId and changes are required' });
      return;
    }

    const data = await redis.get(MENU_KEY);
    const category = data?.categories?.[categorySlug];
    const item = category?.items?.find((i) => i.id === itemId);

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    if ('price' in changes) {
      const price = Number(changes.price);
      if (!Number.isInteger(price) || price < 0) {
        res.status(400).json({ error: 'price must be a non-negative integer' });
        return;
      }
      item.price = price;
    }

    if ('soldOut' in changes) {
      item.soldOut = Boolean(changes.soldOut);
    }

    data.updatedAt = new Date().toISOString();
    await redis.set(MENU_KEY, data);
    res.status(200).json({ ok: true, item });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

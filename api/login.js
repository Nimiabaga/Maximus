import crypto from 'node:crypto';
import { getRedis } from '../lib/redis.js';
import { createSessionToken, setSessionCookie } from '../lib/session.js';

const MAX_ATTEMPTS = 8;
const LOCKOUT_TTL_SECONDS = 15 * 60;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function verifyPasscode(passcode, storedHash) {
  const hash = crypto.scryptSync(passcode, 'maximus-menu-salt', 64);
  const stored = Buffer.from(storedHash, 'hex');
  if (hash.length !== stored.length) return false;
  return crypto.timingSafeEqual(hash, stored);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const storedHash = process.env.ADMIN_PASSCODE_HASH;
  if (!storedHash) {
    res.status(500).json({ error: 'Server is not configured' });
    return;
  }

  const { passcode } = req.body || {};
  if (typeof passcode !== 'string' || !passcode) {
    res.status(400).json({ error: 'Passcode required' });
    return;
  }

  const redis = getRedis();
  const attemptsKey = `login-fail:${getClientIp(req)}`;
  const attempts = Number((await redis.get(attemptsKey)) || 0);

  if (attempts >= MAX_ATTEMPTS) {
    res.status(429).json({ error: 'Too many attempts, try again later' });
    return;
  }

  if (!verifyPasscode(passcode, storedHash)) {
    await redis.set(attemptsKey, attempts + 1, { ex: LOCKOUT_TTL_SECONDS });
    res.status(401).json({ error: 'Incorrect passcode' });
    return;
  }

  await redis.del(attemptsKey);
  setSessionCookie(res, createSessionToken(), req);
  res.status(200).json({ ok: true });
}

import crypto from 'node:crypto';

export const COOKIE_NAME = 'maximus_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken() {
  const secret = requireSecret();
  const payload = base64url(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS }));
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const secret = requireSecret();
  const [payload, signature] = token.split('.');
  const expected = sign(payload, secret);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof exp === 'number' && Date.now() < exp;
  } catch {
    return false;
  }
}

function requireSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('Missing SESSION_SECRET env var');
  return secret;
}

export function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[COOKIE_NAME]);
}

// Vercel terminates TLS and forwards this header; plain local HTTP dev never
// sets it. Only require Secure when the request actually arrived over HTTPS --
// some browsers silently refuse to store a Secure cookie on plain
// http://localhost, which would otherwise make every request after login look
// unauthenticated (a real bug this fixes, not just a local convenience).
function isHttps(req) {
  return req?.headers?.['x-forwarded-proto'] === 'https';
}

export function setSessionCookie(res, token, req) {
  const maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000);
  const secure = isHttps(req) ? ' Secure;' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly;${secure} SameSite=Strict`
  );
}

export function clearSessionCookie(res, req) {
  const secure = isHttps(req) ? ' Secure;' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly;${secure} SameSite=Strict`
  );
}

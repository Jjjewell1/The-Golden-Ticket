import { signPayload, verifyPayload } from './crypto.js';

const COOKIE_NAME = 'gt_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createSessionCookie(user, secret) {
  const payload = { uid: user.id, role: user.role, exp: Date.now() + SESSION_TTL_MS };
  const value = signPayload(payload, secret);
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readSession(req, secret) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.slice(COOKIE_NAME.length + 1);
  const payload = verifyPayload(value, secret);
  if (!payload || !payload.uid || !payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

export function requireAuth({ store, secret }) {
  return (req, res, next) => {
    const session = readSession(req, secret);
    if (!session) return res.status(401).json({ error: 'Login required.' });
    const user = store.findUserById(session.uid);
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'Login required.' });
    req.user = user;
    req.session = session;
    next();
  };
}

export function requireOwner({ store, secret }) {
  return (req, res, next) => {
    const session = readSession(req, secret);
    if (!session) return res.status(401).json({ error: 'Login required.' });
    const user = store.findUserById(session.uid);
    if (!user || user.status !== 'active' || user.role !== 'owner') {
      return res.status(403).json({ error: 'Owner access required.' });
    }
    req.user = user;
    req.session = session;
    next();
  };
}

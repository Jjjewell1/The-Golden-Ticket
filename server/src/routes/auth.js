import { Router } from 'express';
import { hashPassword, verifyPassword } from '../lib/crypto.js';
import { createSessionCookie, clearSessionCookie, requireAuth } from '../lib/session.js';
import { createRateLimiter } from '../lib/ratelimit.js';
import { validatePassword } from '../lib/validate.js';
import { publicUser } from '../lib/sanitize.js';

export function authRouter({ store, jellyfin, romm, mailer, secret, config }) {
  const router = Router();
  const loginLimiter = createRateLimiter(5, 15 * 60 * 1000);
  const forgotLimiter = createRateLimiter(3, 15 * 60 * 1000);
  const auth = requireAuth({ store, secret });

  router.post('/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Enter your username and password.' });

    const key = `${req.ip}:${String(username).toLowerCase()}`;
    if (loginLimiter.check(key)) {
      return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    }
    loginLimiter.note(key);

    const user = store.findUserByUsername(username);
    if (!user || user.status !== 'active' || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'That username or password is not right.' });
    }

    res.setHeader('Set-Cookie', createSessionCookie(user, secret));
    res.json({ user: publicUser(user) });
  });

  router.post('/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', clearSessionCookie());
    res.json({ ok: true });
  });

  router.get('/auth/me', auth, (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  router.post('/auth/forgot', async (req, res) => {
    const { account } = req.body || {};
    const key = `forgot:${req.ip}`;
    if (forgotLimiter.check(key)) {
      return res.status(429).json({ error: 'Too many requests. Try again in 15 minutes.' });
    }
    forgotLimiter.note(key);

    let user = null;
    if (account) {
      user = store.findUserByUsername(account) || store.findUserByEmail(account);
    }
    if (user && user.status === 'active' && mailer.enabled) {
      const raw = await store.createResetToken(user.id, config.resetTokenTtlMs);
      const link = `${config.publicUrl}/reset/${raw}`;
      await mailer.resetLink(user.email, user.username, link);
    }
    res.json({ ok: true });
  });

  router.post('/auth/reset/:token', async (req, res) => {
    const { password } = req.body || {};
    const err = validatePassword(password);
    if (err) return res.status(400).json({ error: err });

    const user = await store.consumeResetToken(req.params.token);
    if (!user) return res.status(400).json({ error: 'That reset link is invalid or expired.' });

    await store.updateUser(user.id, { passwordHash: hashPassword(password) });
    const synced = await Promise.allSettled([
      jellyfin.ensureUserPassword(user.username, password),
      romm.ensureUserPassword(user.username, user.email, password),
    ]);
    res.json({
      ok: true,
      synced: synced.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason.message })),
    });
  });

  return router;
}

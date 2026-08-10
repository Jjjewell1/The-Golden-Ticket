import { Router } from 'express';
import { hashPassword, verifyPassword } from '../lib/crypto.js';
import { createSessionCookie, clearSessionCookie, requireAuth } from '../lib/session.js';
import { createRateLimiter } from '../lib/ratelimit.js';
import { validatePassword, validateDisplayName } from '../lib/validate.js';
import { validateAvatar } from '../lib/avatars.js';
import { publicUser } from '../lib/sanitize.js';

const notifyConfigured = (config) => !!(config.ntfy && config.ntfy.url && config.ntfy.topic);

function withNotifyPrompt(user, config) {
  const pub = publicUser(user);
  pub.notifyPrompt = !!(notifyConfigured(config) && user.role === 'member' && !user.notifyPromptSeen);
  return pub;
}

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
    res.json({ user: withNotifyPrompt(user, config) });
  });

  router.post('/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', clearSessionCookie());
    res.json({ ok: true });
  });

  router.get('/auth/profiles', (req, res) => {
    const profiles = store
      .users()
      .filter((u) => u.status === 'active')
      .map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName || null,
        avatar: u.avatar || null,
      }));
    res.json({ profiles });
  });

  router.get('/auth/me', auth, (req, res) => {
    res.json({ user: withNotifyPrompt(req.user, config) });
  });

  router.patch('/auth/me', auth, (req, res) => {
    const body = req.body || {};
    const { displayName, avatar, notifyPromptSeen } = body;
    if (!('displayName' in body) && !('avatar' in body) && !('notifyPromptSeen' in body)) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }
    const nErr = validateDisplayName(displayName);
    if (nErr) return res.status(400).json({ error: nErr });
    const aErr = validateAvatar(avatar);
    if (aErr) return res.status(400).json({ error: aErr });

    const patch = {};
    if ('displayName' in body) {
      patch.displayName = typeof displayName === 'string' ? displayName.trim() : '';
    }
    if ('avatar' in body) {
      patch.avatar = avatar || '';
    }
    if ('notifyPromptSeen' in body) {
      patch.notifyPromptSeen = notifyPromptSeen === true;
    }
    store.updateUser(req.user.id, patch).then((user) => {
      res.json({ ok: true, user: withNotifyPrompt(user, config) });
    });
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

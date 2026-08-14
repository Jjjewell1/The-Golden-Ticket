import { Router } from 'express';
import { config } from '../config.js';
import { hashPassword, verifyPayload, randomToken } from '../lib/crypto.js';
import { requireOwner } from '../lib/session.js';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateBannerTagline,
  validateAnnouncements,
} from '../lib/validate.js';
import { validateAvatar, validateBannerImage } from '../lib/avatars.js';
import { publicUser } from '../lib/sanitize.js';
import { provision } from '../services/provision.js';
import { decideRequest } from '../services/decide.js';

export function ownerRouter({ store, jellyfin, romm, mailer, secret, onesignal }) {
  const router = Router();
  const ownerOnly = requireOwner({ store, secret });

  const listRequests = (status) =>
    store
      .requests()
      .filter((r) => !status || r.status === status)
      .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)))
      .map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        status: r.status,
        note: r.note || null,
        requestedAt: r.requestedAt,
        decidedAt: r.decidedAt || null,
      }));

  router.get('/owner/requests', ownerOnly, (req, res) => {
    res.json({ requests: listRequests() });
  });

  router.get('/owner/users', ownerOnly, (req, res) => {
    res.json({ users: store.users().map(publicUser) });
  });

  router.post('/owner/users', ownerOnly, async (req, res) => {
    const { username, email, password } = req.body || {};
    const uErr = validateUsername(username);
    if (uErr) return res.status(400).json({ error: uErr });
    const eErr = validateEmail(email);
    if (eErr) return res.status(400).json({ error: eErr });
    const pErr = validatePassword(password);
    if (pErr) return res.status(400).json({ error: pErr });

    const nu = username.trim().toLowerCase();
    const ne = email.trim().toLowerCase();
    if (store.findUserByUsername(nu) || store.findUserByEmail(ne)) {
      return res.status(409).json({ error: 'That username or email already exists.' });
    }

    const provisioned = await provision({ jellyfin, romm, username: nu, email: ne, password });
    if (!provisioned.created.romm && !provisioned.created.jellyfin) {
      return res.status(502).json({
        error: 'Could not create accounts. Check the services.',
        details: provisioned.errors,
      });
    }

    await store.addUser({
      id: store.nextId('u'),
      username: nu,
      email: ne,
      role: 'member',
      status: 'active',
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    });

    const user = store.findUserByUsername(nu);
    if (mailer.enabled) await mailer.welcome(user);
    res.status(201).json({
      ok: true,
      user: publicUser(user),
      provisioned,
      partial: provisioned.created.romm !== provisioned.created.jellyfin,
    });
  });

  router.post('/owner/users/:id/disable', ownerOnly, async (req, res) => {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot disable your own account.' });
    }
    const user = await store.updateUser(req.params.id, { status: 'disabled' });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ ok: true, user: publicUser(user) });
  });

  router.post('/owner/users/:id/enable', ownerOnly, async (req, res) => {
    const user = await store.updateUser(req.params.id, { status: 'active' });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ ok: true, user: publicUser(user) });
  });

  router.post('/owner/users/:id/reset-password', ownerOnly, async (req, res) => {
    const user = store.findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!mailer.enabled) {
      return res.status(503).json({
        error: "Email isn't configured — the user can use the forgot-password form once it is.",
      });
    }
    const raw = await store.createResetToken(user.id, config.resetTokenTtlMs);
    const link = `${config.publicUrl}/reset/${raw}`;
    await mailer.resetLink(user.email, user.username, link);
    res.json({ ok: true });
  });

  router.post('/owner/users/:id/delete', ownerOnly, async (req, res) => {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }
    const user = store.findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role === 'owner') {
      return res.status(400).json({ error: 'You cannot delete the owner account.' });
    }

    const removed = await store.removeUser(req.params.id);
    const synced = await Promise.allSettled([
      jellyfin.deleteUser(user.username),
      romm.deleteUser(user.username),
    ]).then((r) => r.map((x) => (x.status === 'fulfilled' ? x.value : { error: x.reason.message })));

    res.json({ ok: true, user: publicUser(removed), synced });
  });

  router.patch('/owner/users/:id', ownerOnly, async (req, res) => {
    const user = store.findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const body = req.body || {};
    const keys = ['displayName', 'avatar', 'email', 'password'].filter((k) => k in body);
    if (keys.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

    const nErr = validateDisplayName(body.displayName);
    if (nErr) return res.status(400).json({ error: nErr });
    const aErr = validateAvatar(body.avatar);
    if (aErr) return res.status(400).json({ error: aErr });
    if (keys.includes('email')) {
      const eErr = validateEmail(body.email);
      if (eErr) return res.status(400).json({ error: eErr });
      const ne = body.email.trim().toLowerCase();
      const existing = store.findUserByEmail(ne);
      if (existing && existing.id !== user.id) {
        return res.status(409).json({ error: 'That email is already in use.' });
      }
    }
    if (keys.includes('password')) {
      const pErr = validatePassword(body.password);
      if (pErr) return res.status(400).json({ error: pErr });
    }

    const patch = {};
    if (keys.includes('displayName')) {
      patch.displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    }
    if (keys.includes('avatar')) patch.avatar = body.avatar || '';
    if (keys.includes('email')) patch.email = body.email.trim().toLowerCase();

    let synced = [];
    if (keys.includes('password')) {
      patch.passwordHash = hashPassword(body.password);
      synced = await Promise.allSettled([
        jellyfin.ensureUserPassword(user.username, body.password),
        romm.ensureUserPassword(user.username, body.email?.trim()?.toLowerCase() || user.email, body.password),
      ]).then((r) => r.map((x) => (x.status === 'fulfilled' ? x.value : { error: x.reason.message })));
    } else if (keys.includes('email')) {
      const ne = patch.email;
      synced = await Promise.allSettled([romm.updateUserEmail(user.username, ne)]).then((r) =>
        r.map((x) => (x.status === 'fulfilled' ? x.value : { error: x.reason.message })),
      );
    }

    const updated = await store.updateUser(user.id, patch);
    res.json({
      ok: true,
      user: publicUser(updated),
      synced,
    });
  });

  router.get('/owner/settings', ownerOnly, (req, res) => {
    res.json({
      banner: store.getSetting('banner', { image: '', tagline: '' }),
      announcements: store.getSetting('announcements', []),
    });
  });

  router.patch('/owner/settings', ownerOnly, async (req, res) => {
    const body = req.body || {};
    const patch = {};
    const prevAnnouncements = store.getSetting('announcements', []);

    if ('banner' in body) {
      const b = body.banner || {};
      const imgErr = validateBannerImage(b.image);
      if (imgErr) return res.status(400).json({ error: imgErr });
      const tagErr = validateBannerTagline(b.tagline);
      if (tagErr) return res.status(400).json({ error: tagErr });
      const image = String(b.image || '').trim();
      const tagline = String(b.tagline || '').trim();
      patch.banner = image || tagline ? { image, tagline } : null;
    }

    if ('announcements' in body) {
      const aErr = validateAnnouncements(body.announcements);
      if (aErr) return res.status(400).json({ error: aErr });
      const list = (body.announcements || [])
        .filter((a) => a && a.title && String(a.title).trim())
        .map((a) => ({
          id: a.id || randomToken().slice(0, 12),
          title: String(a.title || '').trim(),
          body: String(a.body || '').trim(),
          enabled: a.enabled !== false,
        }));
      patch.announcements = list.length ? list : null;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    await Promise.all(
      Object.entries(patch).map(([k, v]) => store.setSetting(k, v)),
    );

    if (onesignal?.enabled && 'announcements' in patch) {
      const prev = Array.isArray(prevAnnouncements) ? prevAnnouncements : [];
      const prevIds = new Set(prev.map((a) => a && a.id));
      const fresh = (patch.announcements || []).filter((a) => a.enabled && !prevIds.has(a.id));
      for (const a of fresh) {
        await onesignal.notify({
          headings: '📣 New announcement',
          contents: a.title + (a.body ? ` — ${a.body}` : ''),
          url: config.publicUrl,
          subscriptionIds: store.activePlayerIds(),
        });
      }
    }

    res.json({
      ok: true,
      banner: store.getSetting('banner', { image: '', tagline: '' }),
      announcements: store.getSetting('announcements', []),
    });
  });

  router.post('/owner/test-notify', ownerOnly, async (req, res) => {
    if (!onesignal || !onesignal.enabled) {
      return res.status(503).json({ error: 'Notifications are not configured yet.' });
    }
    const playerIds = store.activePlayerIds();
    if (playerIds.length === 0) {
      return res.status(400).json({ error: 'No members have subscribed yet — open the site, tap the bell, and allow notifications first.' });
    }
    await onesignal.notify({
      headings: 'Test from The Golden Ticket 🥳',
      contents: 'This is a test notification — members will see something like this when new media is added.',
      url: config.publicUrl,
      subscriptionIds: playerIds,
    });
    res.json({ ok: true });
  });

  router.post('/owner/decision/:requestId', ownerOnly, async (req, res) => {
    const { action, note } = req.body || {};
    const result = await decideRequest({
      store,
      jellyfin,
      romm,
      mailer,
      secret,
      requestId: req.params.requestId,
      action,
      note,
    });
    res.status(result.status).json(result.status === 200 ? result : { error: result.error });
  });

  router.post('/owner/decision-link/:token', async (req, res) => {
    const payload = verifyPayload(req.params.token, secret);
    const requestId =
      payload && payload.req && payload.exp && payload.exp > Date.now() ? payload.req : null;
    if (!requestId) return res.status(400).json({ error: 'That link is invalid or expired.' });

    const { action, note } = req.body || {};
    const result = await decideRequest({
      store,
      jellyfin,
      romm,
      mailer,
      secret,
      requestId,
      action,
      note,
    });
    res.status(result.status).json(result.status === 200 ? result : { error: result.error });
  });

  return router;
}

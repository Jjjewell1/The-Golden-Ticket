import { Router } from 'express';
import { config } from '../config.js';
import { hashPassword, verifyPayload } from '../lib/crypto.js';
import { requireOwner } from '../lib/session.js';
import { validateUsername, validateEmail, validatePassword } from '../lib/validate.js';
import { publicUser } from '../lib/sanitize.js';
import { provision } from '../services/provision.js';
import { decideRequest } from '../services/decide.js';

export function ownerRouter({ store, jellyfin, romm, mailer, secret }) {
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

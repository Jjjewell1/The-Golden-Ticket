import { Router } from 'express';
import { config } from '../config.js';
import { hashPassword, encryptSecret, signPayload } from '../lib/crypto.js';
import { createRateLimiter } from '../lib/ratelimit.js';
import { validateUsername, validateEmail, validatePassword } from '../lib/validate.js';
import { provision } from '../services/provision.js';

export function signupRouter({ jellyfin, romm, store, mailer, pushover }) {
  const router = Router();
  const limiter = createRateLimiter(5, 15 * 60 * 1000);

  router.post('/signup', async (req, res) => {
    const ip = req.ip || 'unknown';

    if (limiter.check(ip)) {
      return res.status(429).json({ error: 'Too many signup attempts. Please wait 15 minutes.' });
    }

    const { ticketCode, username, email, password } = req.body || {};

    if (!config.ticketCode || !jellyfin.apiKey || !romm.adminUser || !romm.adminPassword) {
      return res.status(503).json({ error: 'Signup is not configured yet.' });
    }

    const uErr = validateUsername(username);
    if (uErr) return res.status(400).json({ error: uErr });
    const eErr = validateEmail(email);
    if (eErr) return res.status(400).json({ error: eErr });
    const pErr = validatePassword(password);
    if (pErr) return res.status(400).json({ error: pErr });

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    limiter.note(ip);

    const [storeUser, storeEmail, pendingUser, pendingEmail, jf, rm] = await Promise.all([
      store.findUserByUsername(normalizedUsername),
      store.findUserByEmail(normalizedEmail),
      store.findRequestByUsername(normalizedUsername),
      store.findRequestByEmail(normalizedEmail),
      jellyfin.findUser(normalizedUsername).catch(() => null),
      romm.findUser(normalizedUsername).catch(() => null),
    ]);

    if (storeUser || jf || rm) {
      return res.status(409).json({ error: 'That username is already taken. Try another.' });
    }
    if (storeEmail) {
      return res.status(409).json({ error: 'An account already exists with that email.' });
    }
    if (pendingUser || pendingEmail) {
      return res.status(409).json({ error: 'You already have a request waiting on the owner. Hang tight!' });
    }

    const hasCode = typeof ticketCode === 'string' && ticketCode.trim().length > 0;

    if (hasCode) {
      if (ticketCode.trim() !== config.ticketCode) {
        return res.status(403).json({ error: 'That ticket code is not right.' });
      }

      const provisioned = await provision({
        jellyfin,
        romm,
        username: normalizedUsername,
        email: normalizedEmail,
        password,
      });
      if (!provisioned.created.romm && !provisioned.created.jellyfin) {
        return res.status(502).json({
          error: 'We could not create your accounts. Please let the owner know.',
          details: provisioned.errors,
        });
      }

      await store.addUser({
        id: store.nextId('u'),
        username: normalizedUsername,
        email: normalizedEmail,
        role: 'member',
        status: 'active',
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      });

      const user = store.findUserByUsername(normalizedUsername);
      if (mailer.enabled) await mailer.welcome(user);

      return res.status(201).json({
        ok: true,
        username: normalizedUsername,
        created: provisioned.created,
        partial: provisioned.created.romm !== provisioned.created.jellyfin,
        message:
          provisioned.created.romm && provisioned.created.jellyfin
            ? 'Both accounts are ready — sign in!'
            : provisioned.created.romm
              ? 'Your RomM account is ready, but Jellyfin is having trouble. The owner will fix it.'
              : 'Your Jellyfin account is ready, but RomM is having trouble. The owner will fix it.',
      });
    }

    if (!pushover.enabled) {
      return res.status(503).json({
        error: "Owner approval isn't available right now. Ask the owner or use the ticket code.",
      });
    }

    const passwordEnc = encryptSecret(password, config.sessionSecret);
    const requestId = store.nextId('req');
    await store.addRequest({
      id: requestId,
      username: normalizedUsername,
      email: normalizedEmail,
      requestedAt: new Date().toISOString(),
      passwordEnc,
      status: 'pending',
      note: null,
      decidedAt: null,
    });

    const token = signPayload(
      { req: requestId, exp: Date.now() + config.approvalLinkTtlMs },
      config.sessionSecret,
    );
    const link = `${config.publicUrl}/owner/approve/${token}`;
    await pushover.notify({
      title: 'New Golden Ticket request 🎟️',
      message: `${normalizedUsername} (${normalizedEmail}) wants access.`,
      url: link,
      urlTitle: 'Approve or deny',
    });

    return res.status(201).json({
      ok: true,
      pending: true,
      username: normalizedUsername,
      message: 'Your request is in — the owner has been pinged. You will get an email once they decide.',
    });
  });

  return router;
}

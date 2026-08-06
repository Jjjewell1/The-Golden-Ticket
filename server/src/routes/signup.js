import { Router } from 'express';
import { config } from '../config.js';

const attempts = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (now > entry.resetAt) {
    attempts.delete(ip);
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count += 1;
  return false;
}

function noteAttempt(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  } else {
    entry.count += 1;
  }
  if (attempts.size > 2000) attempts.clear();
}

function validateUsername(name) {
  return /^[a-zA-Z0-9_\-.]{3,32}$/.test(name);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(pw) {
  return typeof pw === 'string' && pw.length >= 6 && pw.length <= 128;
}

export function signupRouter({ jellyfin, romm }) {
  const router = Router();

  router.post('/signup', async (req, res) => {
    const ip = req.ip || 'unknown';

    if (rateLimited(ip)) {
      return res.status(429).json({ error: 'Too many signup attempts. Please wait 15 minutes.' });
    }

    const { ticketCode, username, email, password } = req.body || {};

    if (!config.ticketCode || !jellyfin.apiKey || !romm.adminUser || !romm.adminPassword) {
      return res.status(503).json({ error: 'Signup is not configured yet.' });
    }

    if (ticketCode !== config.ticketCode) {
      noteAttempt(ip);
      return res.status(403).json({ error: 'That ticket code is not right. Ask the owner for the current one.' });
    }

    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Username must be 3-32 characters (letters, numbers, _ - .).' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'That email address does not look valid.' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedUsername = username.toLowerCase();
    noteAttempt(ip);

    const existing = await Promise.all([
      jellyfin.findUser(normalizedUsername).catch(() => null),
      romm.findUser(normalizedUsername).catch(() => null),
    ]);
    if (existing[0] || existing[1]) {
      return res.status(409).json({ error: 'That username is already taken. Try another.' });
    }

    const created = { jellyfin: false, romm: false };
    const errors = [];

    try {
      await romm.createUser(normalizedUsername, email, password);
      created.romm = true;
    } catch (err) {
      errors.push({ service: 'romm', message: err.message });
    }

    try {
      await jellyfin.createUser(normalizedUsername, password);
      created.jellyfin = true;
    } catch (err) {
      errors.push({ service: 'jellyfin', message: err.message });
    }

    if (!created.romm && !created.jellyfin) {
      return res.status(502).json({
        error: 'We could not create your accounts. Please let the owner know.',
        details: errors,
      });
    }

    return res.status(201).json({
      ok: true,
      username: normalizedUsername,
      created,
      partial: created.romm !== created.jellyfin,
      message:
        created.romm && created.jellyfin
          ? 'Both accounts are ready!'
          : created.romm
            ? 'Your RomM account is ready, but Jellyfin is having trouble. The owner will fix it.'
            : 'Your Jellyfin account is ready, but RomM is having trouble. The owner will fix it.',
    });
  });

  return router;
}

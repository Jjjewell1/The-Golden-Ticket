import { hashPassword, decryptSecret } from '../lib/crypto.js';
import { provision } from './provision.js';

export async function decideRequest({ store, jellyfin, romm, mailer, secret, requestId, action, note }) {
  const req = store.findRequestById(requestId);
  if (!req) return { status: 404, error: 'That request could not be found.' };
  if (req.status !== 'pending') {
    return { status: 400, error: 'This request was already decided.' };
  }

  if (action === 'approve') {
    const password = decryptSecret(req.passwordEnc, secret);
    if (!password) return { status: 500, error: 'Could not recover the password for this request.' };

    const existing = await Promise.all([
      jellyfin.findUser(req.username).catch(() => null),
      romm.findUser(req.username).catch(() => null),
    ]);
    if (existing[0] || existing[1]) {
      return {
        status: 409,
        error: 'That username already exists now — the request is still pending. Deny it instead.',
      };
    }

    const provisioned = await provision({ jellyfin, romm, username: req.username, email: req.email, password });

    await store.addUser({
      id: store.nextId('u'),
      username: req.username,
      email: req.email,
      role: 'member',
      status: 'active',
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    });
    await store.updateRequest(requestId, {
      status: 'approved',
      note: note || null,
      decidedAt: new Date().toISOString(),
    });

    const user = store.findUserByUsername(req.username);
    if (mailer.enabled) await mailer.approved(user);
    return { status: 200, ok: true, action: 'approved', provisioned };
  }

  if (action === 'deny') {
    await store.updateRequest(requestId, {
      status: 'denied',
      note: note || null,
      decidedAt: new Date().toISOString(),
    });
    if (mailer.enabled) await mailer.denied(req.email, req.username, note);
    return { status: 200, ok: true, action: 'denied' };
  }

  return { status: 400, error: 'Unknown action.' };
}

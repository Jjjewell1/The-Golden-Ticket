import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { Store } from './lib/store.js';
import { Mailer } from './lib/mailer.js';
import { Pushover } from './lib/pushover.js';
import { OneSignal } from './lib/onesignal.js';
import { hashPassword } from './lib/crypto.js';
import { Jellyfin } from './services/jellyfin.js';
import { Romm } from './services/romm.js';
import { Seerr } from './services/seerr.js';
import { Linkwarden } from './services/linkwarden.js';
import { startBroadcaster } from './services/broadcast.js';
import { apiRouter } from './routes/api.js';
import { signupRouter } from './routes/signup.js';
import { authRouter } from './routes/auth.js';
import { ownerRouter } from './routes/owner.js';
import { approveRouter } from './routes/approve.js';
import { resetRouter } from './routes/reset.js';
import { ogRouter } from './routes/og.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const store = new Store(config.dataDir).load();
const jellyfin = new Jellyfin(config.jellyfin);
const romm = new Romm(config.romm);
const seerr = new Seerr(config.seerr);
const linkwarden = new Linkwarden(config.linkwarden);
const mailer = new Mailer(config.smtp);
const pushover = new Pushover(config.pushover);
const onesignal = new OneSignal(config.onesignal);

(function seedOwner() {
  const ownerExists = store.users().some((u) => u.role === 'owner');
  if (ownerExists) return;
  if (!config.ownerAccount || !config.ownerAccountPassword) {
    console.warn(
      '[auth] No owner account exists. Set OWNER_ACCOUNT + OWNER_ACCOUNT_PASSWORD in server/.env to bootstrap one.',
    );
    return;
  }
  store.addUser({
    id: store.nextId('u'),
    username: config.ownerAccount,
    email: '',
    role: 'owner',
    status: 'active',
    passwordHash: hashPassword(config.ownerAccountPassword),
    createdAt: new Date().toISOString(),
  });
  console.log(`[auth] Seeded owner account "${config.ownerAccount}"`);
})();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use('/api', apiRouter({ jellyfin, romm, seerr, linkwarden, store, secret: config.sessionSecret, pushover, onesignal }));
app.use('/api', signupRouter({ jellyfin, romm, store, mailer, pushover }));
app.use('/api', authRouter({ store, jellyfin, romm, mailer, secret: config.sessionSecret, config }));
app.use('/api', ownerRouter({ store, jellyfin, romm, mailer, secret: config.sessionSecret, onesignal }));
app.use('/', approveRouter({ store, secret: config.sessionSecret }));
app.use('/', resetRouter({ store }));
app.use('/', ogRouter({ jellyfin, romm }));

const webDist = path.resolve(__dirname, '..', config.webDist);
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    if (req.path.startsWith('/og-image.png')) return next();
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

(async () => {
  try {
    await jellyfin.getSessions();
    console.log('[smoke] Jellyfin OK');
  } catch (err) {
    console.log('[smoke] Jellyfin FAIL', err.message);
  }
  try {
    await romm.getRecentGames(1);
    console.log('[smoke] RomM OK');
  } catch (err) {
    console.log('[smoke] RomM FAIL', err.message);
  }
  try {
    await linkwarden.getStatus();
    console.log('[smoke] Linkwarden OK');
  } catch (err) {
    console.log('[smoke] Linkwarden FAIL', err.message);
  }
})();

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Bad request.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`The Golden Ticket listening on http://0.0.0.0:${config.port}`);
  console.log(`Public URL: ${config.publicUrl}`);
});

startBroadcaster({
  onesignal,
  jellyfin,
  romm,
  store,
  publicUrl: config.publicUrl,
});

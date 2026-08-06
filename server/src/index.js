import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { Jellyfin } from './services/jellyfin.js';
import { Romm } from './services/romm.js';
import { Seerr } from './services/seerr.js';
import { apiRouter } from './routes/api.js';
import { signupRouter } from './routes/signup.js';
import { ogRouter } from './routes/og.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const jellyfin = new Jellyfin(config.jellyfin);
const romm = new Romm(config.romm);
const seerr = new Seerr(config.seerr);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use('/api', apiRouter({ jellyfin, romm, seerr }));
app.use('/api', signupRouter({ jellyfin, romm }));
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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`The Golden Ticket listening on http://0.0.0.0:${config.port}`);
  console.log(`Public URL: ${config.publicUrl}`);
});

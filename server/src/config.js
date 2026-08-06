import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = process.env;

function parseAnnouncements(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseApps(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const DEFAULT_APPS = [
  {
    group: 'Watch',
    icon: '🎬',
    name: 'Jellyfin',
    tagline: 'Movies & TV shows',
    url: 'https://movies.jewellcore.com',
    accent: '#b8860b',
  },
  {
    group: 'Play',
    icon: '🕹️',
    name: 'RomM',
    tagline: 'Retro game library',
    url: 'https://games.jewellcore.com',
    accent: '#7c4dff',
  },
  {
    group: 'Request',
    icon: '🎟️',
    name: 'Media Requests',
    tagline: 'Ask for a movie or show',
    url: 'https://grab.jewellcore.com',
    accent: '#e63946',
  },
  {
    group: 'Photos',
    icon: '📸',
    name: 'Immich',
    tagline: 'Family photo library',
    url: 'https://photos.jewellcore.com',
    accent: '#e86a17',
  },
  {
    group: 'Files',
    icon: '☁️',
    name: 'Nextcloud',
    tagline: 'Files & shared folders',
    url: 'https://cloud.jewellcore.com',
    accent: '#0082c9',
  },
  {
    group: 'Save It',
    icon: '📑',
    name: 'Karakeep',
    tagline: 'Bookmarks & read-later',
    url: 'https://karakeep.jewellcore.com',
    accent: '#22c55e',
  },
];

export const OWNER_APPS = [
  {
    icon: '📺',
    name: 'Sonarr',
    tagline: 'TV downloads',
    url: 'https://sonarr.jewellcore.com',
    accent: '#6c8bd4',
  },
  {
    icon: '🎞️',
    name: 'Radarr',
    tagline: 'Movie downloads',
    url: 'https://radarr.jewellcore.com',
    accent: '#f98f42',
  },
  {
    icon: '⬇️',
    name: 'SABnzbd',
    tagline: 'Usenet downloads',
    url: 'https://sabnzbd.jewellcore.com',
    accent: '#4aa3c2',
  },
  {
    icon: '🔎',
    name: 'Prowlarr',
    tagline: 'Indexers',
    url: 'https://prowlarr.jewellcore.com',
    accent: '#e07a5f',
  },
  {
    icon: '📊',
    name: 'Jellystat',
    tagline: 'Watch stats',
    url: 'https://jellystat.jewellcore.com',
    accent: '#a3b18a',
  },
  {
    icon: '🧭',
    name: 'Dashboard',
    tagline: 'Homarr overview',
    url: 'https://dashboard.jewellcore.com',
    accent: '#588157',
  },
  {
    icon: '🤖',
    name: 'OpenCode',
    tagline: 'Dev tools',
    url: 'https://opencode.jewellcore.com',
    accent: '#8d99ae',
  },
];

export const config = {
  port: Number(env.PORT || 8080),
  publicUrl: (env.PUBLIC_URL || 'http://localhost:8080').replace(/\/+$/, ''),
  webDist: env.WEB_DIST || './web-dist',
  jellyfin: {
    url: (env.JELLYFIN_URL || 'http://192.168.1.154:8096').replace(/\/+$/, ''),
    apiKey: env.JELLYFIN_API_KEY || '',
    user: env.JELLYFIN_USER || '',
  },
  romm: {
    url: (env.ROMM_URL || 'http://192.168.1.154:8090').replace(/\/+$/, ''),
    adminUser: env.ROMM_ADMIN_USER || '',
    adminPassword: env.ROMM_ADMIN_PASSWORD || '',
  },
  seerr: {
    url: (env.SEERR_URL || 'http://192.168.1.154:5055').replace(/\/+$/, ''),
    apiKey: env.SEERR_API_KEY || '',
  },
  ticketCode: env.TICKET_CODE || '',
  ownerPin: env.OWNER_PIN || '',
  ownerAccount: (env.OWNER_ACCOUNT || '').toLowerCase(),
  ownerAccountPassword: env.OWNER_ACCOUNT_PASSWORD || '',
  announcements: parseAnnouncements(env.ANNOUNCEMENTS),
  apps: parseApps(env.APPS) || DEFAULT_APPS,
  ownerApps: OWNER_APPS,
  cacheTtlMs: Number(env.CACHE_TTL_MS || 60_000),
  sessionSecret: env.SESSION_SECRET || '',
  dataDir: env.DATA_DIR || path.join(__dirname, '..', 'data'),
  pushover: {
    token: env.PUSHOVER_TOKEN || '',
    user: env.PUSHOVER_USER || '',
  },
  smtp: {
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(env.SMTP_PORT || 465),
    secure: env.SMTP_SECURE !== 'false',
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.EMAIL_FROM || env.SMTP_USER || '',
    dry: env.SMTP_DRY === 'true',
  },
  approvalLinkTtlMs: 7 * 24 * 60 * 60 * 1000,
  resetTokenTtlMs: 15 * 60 * 1000,
};

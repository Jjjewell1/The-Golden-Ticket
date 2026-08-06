export const AVATAR_PALETTE = [
  '🎩',
  '🦊',
  '🐻',
  '🦁',
  '🐼',
  '🐸',
  '🦉',
  '🐙',
  '🍿',
  '🎬',
  '🕹️',
  '🎮',
  '🕶️',
  '😎',
  '🤠',
  '🧙',
  '🦸',
  '🧑‍🎤',
  '🧑‍🍳',
  '🧑‍🚀',
  '🦄',
  '🍕',
  '🍩',
  '🥷',
];

export const AVATAR_MAX_BYTES = 1_500_000;

const DATA_RE = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/;

export function isPaletteAvatar(v) {
  return typeof v === 'string' && AVATAR_PALETTE.includes(v);
}

export function isDataAvatar(v) {
  if (typeof v !== 'string' || !v.startsWith('data:image/')) return false;
  const m = DATA_RE.exec(v);
  if (!m) return false;
  const decodedLen = Math.floor((m[2].length * 3) / 4);
  return decodedLen <= AVATAR_MAX_BYTES;
}

export function validateAvatar(v) {
  if (v === null || v === undefined || v === '') return null;
  if (isPaletteAvatar(v)) return null;
  if (isDataAvatar(v)) return null;
  return 'Pick an icon from the set, or upload a photo (png/jpeg/webp/gif, under 1.5 MB).';
}

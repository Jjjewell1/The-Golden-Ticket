export async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function getConfig() {
  return getJson('/api/config');
}

export async function getRecentlyAdded() {
  return getJson('/api/recently-added');
}

export async function getGames() {
  return getJson('/api/games');
}

export async function getMovies() {
  return getJson('/api/movies');
}

export async function getRandom() {
  return getJson('/api/random');
}

export async function getSessions() {
  return getJson('/api/sessions');
}

export async function getRequestCount() {
  return getJson('/api/requests');
}

export async function getStatus() {
  return getJson('/api/status');
}

export async function postSignup(payload) {
  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function verifyOwnerPin(pin) {
  const res = await getJson(`/api/owner/verify?pin=${encodeURIComponent(pin)}`);
  return res.ok;
}

export function posterUrl(id, tag, width = 400) {
  const params = new URLSearchParams();
  if (tag) params.set('tag', tag);
  if (width) params.set('maxWidth', String(width));
  const qs = params.toString();
  return `/api/img/jf/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`;
}

export function gameCoverUrl(coverPath) {
  if (!coverPath) return null;
  return `/api/img/romm?path=${encodeURIComponent(coverPath)}`;
}

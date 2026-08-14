export async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    if (detail && detail.error) throw new Error(detail.error);
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

async function postJson(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function patchJson(path, payload) {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function deleteJson(path) {
  const res = await fetch(path, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function getConfig() {
  return getJson('/api/config');
}

export async function getRecentlyAdded(type = 'all', limit = 0) {
  const params = new URLSearchParams();
  if (type && type !== 'all') params.set('type', type);
  if (limit > 0) params.set('limit', String(limit));
  const qs = params.toString();
  return getJson(`/api/recently-added${qs ? `?${qs}` : ''}`);
}

export async function getGames() {
  return getJson('/api/games');
}

export async function getMovies() {
  return getJson('/api/movies');
}

export async function getMovieDetail(id) {
  return getJson(`/api/movies/${encodeURIComponent(id)}`);
}

export async function getGameDetail(id) {
  return getJson(`/api/games/${encodeURIComponent(id)}`);
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

export async function getRequests() {
  return getJson('/api/requests');
}

export async function getStatus() {
  return getJson('/api/status');
}

export async function postSignup(payload) {
  return postJson('/api/signup', payload);
}

export async function postLogin(payload) {
  return postJson('/api/auth/login', payload);
}

export async function postLogout() {
  return postJson('/api/auth/logout');
}

export function getMe() {
  return getJson('/api/auth/me');
}

export function getAuthProfiles() {
  return getJson('/api/auth/profiles');
}

export async function patchMe(payload) {
  return patchJson('/api/auth/me', payload);
}

export async function postForgot(payload) {
  return postJson('/api/auth/forgot', payload);
}

export async function postReset(token, payload) {
  return postJson(`/api/auth/reset/${encodeURIComponent(token)}`, payload);
}

export function getOwnerRequests() {
  return getJson('/api/owner/requests');
}

export function getOwnerUsers() {
  return getJson('/api/owner/users');
}

export async function postOwnerAddUser(payload) {
  return postJson('/api/owner/users', payload);
}

export async function postOwnerDecision(requestId, payload) {
  return postJson(`/api/owner/decision/${encodeURIComponent(requestId)}`, payload);
}

export async function postOwnerUserAction(userId, action) {
  return postJson(`/api/owner/users/${encodeURIComponent(userId)}/${action}`);
}

export async function postOwnerUserDelete(userId) {
  return postJson(`/api/owner/users/${encodeURIComponent(userId)}/delete`);
}

export async function patchOwnerUser(userId, payload) {
  return patchJson(`/api/owner/users/${encodeURIComponent(userId)}`, payload);
}

export function getOwnerSettings() {
  return getJson('/api/owner/settings');
}

export async function patchOwnerSettings(payload) {
  return patchJson('/api/owner/settings', payload);
}

export function postOwnerTestNotify() {
  return postJson('/api/owner/test-notify');
}

export async function getMyDevices() {
  return getJson('/api/notify/devices');
}

export async function postNotifyDevice(playerId, label) {
  return postJson('/api/notify/device', { playerId, label });
}

export async function deleteNotifyDevice(playerId) {
  return deleteJson(`/api/notify/device/${encodeURIComponent(playerId)}`);
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

const JELLYFIN_URL = 'https://movies.jewellcore.com';

export function movieHref(id) {
  return `${JELLYFIN_URL}/web/index.html#/details?id=${encodeURIComponent(id)}`;
}

export function gameCoverUrl(coverPath) {
  if (!coverPath) return null;
  return `/api/img/romm?path=${encodeURIComponent(coverPath)}`;
}

export async function getLinks(q, cursor) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (cursor) params.set('cursor', String(cursor));
  const qs = params.toString();
  return getJson(`/api/links${qs ? `?${qs}` : ''}`);
}

export function linkPreviewUrl(link) {
  if (!link || !link.hasPreview) return null;
  const params = new URLSearchParams({ id: String(link.id) });
  if (link.updatedAt) params.set('updatedAt', link.updatedAt);
  return `/api/img/lw?${params.toString()}`;
}

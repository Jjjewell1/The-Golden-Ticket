import fs from 'node:fs';
import path from 'node:path';
import { randomToken, sha256 } from './crypto.js';

export class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'users.json');
    this.data = { users: [], requests: [], resetTokens: [], devices: [], messages: [], settings: {} };
    this.writeQueue = Promise.resolve();
  }

  load() {
    fs.mkdirSync(this.dir, { recursive: true });
    if (fs.existsSync(this.file)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        this.data = {
          users: Array.isArray(raw.users) ? raw.users : [],
          requests: Array.isArray(raw.requests) ? raw.requests : [],
          resetTokens: Array.isArray(raw.resetTokens) ? raw.resetTokens : [],
          devices: Array.isArray(raw.devices) ? raw.devices : [],
          messages: Array.isArray(raw.messages) ? raw.messages : [],
          settings: raw.settings && typeof raw.settings === 'object' ? raw.settings : {},
        };
      } catch (err) {
        console.error('Store: could not parse users.json, starting fresh:', err.message);
      }
    } else {
      this._persist();
    }
    return this;
  }

  _persist() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  _save() {
    this.writeQueue = this.writeQueue.then(() => {
      try {
        this._persist();
      } catch (err) {
        console.error('Store: save failed:', err.message);
      }
    });
    return this.writeQueue;
  }

  nextId(prefix) {
    return `${prefix}_${randomToken().slice(0, 16)}`;
  }

  /* ---------- users ---------- */

  users() {
    return this.data.users;
  }

  findUserByUsername(username) {
    const u = String(username || '').toLowerCase();
    return this.data.users.find((x) => x.username === u) || null;
  }

  findUserByEmail(email) {
    const e = String(email || '').toLowerCase();
    return this.data.users.find((x) => x.email === e) || null;
  }

  findUserById(id) {
    return this.data.users.find((x) => x.id === id) || null;
  }

  addUser(user) {
    this.data.users.push(user);
    return this._save();
  }

  updateUser(id, patch) {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, patch);
    return this._save().then(() => user);
  }

  removeUser(id) {
    const idx = this.data.users.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    const [user] = this.data.users.splice(idx, 1);
    this.data.devices = this.data.devices.filter((d) => d.userId !== id);
    return this._save().then(() => user);
  }

  /* ---------- push devices (OneSignal subscriptions) ---------- */

  devices() {
    return this.data.devices;
  }

  findDevice(playerId) {
    return this.data.devices.find((d) => d.playerId === playerId) || null;
  }

  addDevice({ userId, playerId, label = '' }) {
    const existing = this.findDevice(playerId);
    if (existing) {
      existing.userId = userId;
      existing.label = label || existing.label;
      existing.lastSeenAt = new Date().toISOString();
    } else {
      this.data.devices.push({
        userId,
        playerId,
        label: label || '',
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });
    }
    return this._save();
  }

  removeDevice(playerId) {
    const idx = this.data.devices.findIndex((d) => d.playerId === playerId);
    if (idx === -1) return false;
    this.data.devices.splice(idx, 1);
    return this._save().then(() => true);
  }

  removeDevicesForUser(userId) {
    const before = this.data.devices.length;
    this.data.devices = this.data.devices.filter((d) => d.userId !== userId);
    if (this.data.devices.length === before) return Promise.resolve();
    return this._save();
  }

  allPlayerIds() {
    return this.data.devices.map((d) => d.playerId).filter(Boolean);
  }

  // Player IDs belonging to active accounts only (skips deleted/disabled users).
  activePlayerIds() {
    const active = new Set(
      this.data.users.filter((u) => u.status === 'active').map((u) => u.id),
    );
    return this.data.devices.filter((d) => active.has(d.userId)).map((d) => d.playerId).filter(Boolean);
  }

  /* ---------- messages (owner messaging center history) ---------- */

  messages() {
    return this.data.messages;
  }

  findMessage(id) {
    return this.data.messages.find((m) => m.id === id) || null;
  }

  addMessage(msg) {
    this.data.messages.push(msg);
    return this._save();
  }

  updateMessage(id, patch) {
    const msg = this.findMessage(id);
    if (!msg) return null;
    Object.assign(msg, patch);
    return this._save().then(() => msg);
  }

  removeMessage(id) {
    const idx = this.data.messages.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    this.data.messages.splice(idx, 1);
    return this._save().then(() => true);
  }

  /* ---------- signup requests ---------- */

  requests() {
    return this.data.requests;
  }

  findRequestByUsername(username) {
    const u = String(username || '').toLowerCase();
    return this.data.requests.find((x) => x.username === u) || null;
  }

  findRequestByEmail(email) {
    const e = String(email || '').toLowerCase();
    return this.data.requests.find((x) => x.email === e) || null;
  }

  findRequestById(id) {
    return this.data.requests.find((x) => x.id === id) || null;
  }

  addRequest(req) {
    this.data.requests.push(req);
    return this._save();
  }

  updateRequest(id, patch) {
    const req = this.findRequestById(id);
    if (!req) return null;
    Object.assign(req, patch);
    return this._save().then(() => req);
  }

  /* ---------- reset tokens ---------- */

  createResetToken(userId, ttlMs) {
    const raw = randomToken();
    const record = {
      hash: sha256(raw),
      userId,
      expiresAt: Date.now() + ttlMs,
      used: false,
    };
    this.data.resetTokens.push(record);
    return this._save().then(() => raw);
  }

  async consumeResetToken(raw) {
    const hash = sha256(raw);
    const now = Date.now();
    const token = this.data.resetTokens.find((t) => t.hash === hash);
    if (!token) return null;
    if (token.used || token.expiresAt < now) return null;
    token.used = true;
    await this._save();
    return this.findUserById(token.userId);
  }

  peekResetToken(raw) {
    const hash = sha256(raw);
    const token = this.data.resetTokens.find((t) => t.hash === hash);
    if (!token) return null;
    if (token.used || token.expiresAt < Date.now()) return null;
    return this.findUserById(token.userId);
  }

  /* ---------- settings ---------- */

  getSetting(key, fallback = null) {
    const v = this.data.settings[key];
    return v === undefined || v === null ? fallback : v;
  }

  setSetting(key, value) {
    if (value === null || value === undefined) {
      delete this.data.settings[key];
    } else {
      this.data.settings[key] = value;
    }
    return this._save();
  }
}

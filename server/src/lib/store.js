import fs from 'node:fs';
import path from 'node:path';
import { randomToken, sha256 } from './crypto.js';

export class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'users.json');
    this.data = { users: [], requests: [], resetTokens: [] };
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
}

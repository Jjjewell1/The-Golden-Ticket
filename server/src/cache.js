export function createTtlCache(defaultTtlMs) {
  const store = new Map();

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expires < Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value, ttlMs = defaultTtlMs) {
      store.set(key, { value, expires: Date.now() + ttlMs });
    },
    async wrap(key, fn, ttlMs = defaultTtlMs) {
      const hit = this.get(key);
      if (hit !== undefined) return hit;
      const value = await fn();
      this.set(key, value, ttlMs);
      return value;
    },
  };
}

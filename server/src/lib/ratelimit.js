export function createRateLimiter(limit = 5, windowMs = 15 * 60 * 1000) {
  const attempts = new Map();

  function cleanup(now) {
    for (const [key, rec] of attempts) {
      if (rec.resetAt < now) attempts.delete(key);
    }
  }

  function check(key) {
    const now = Date.now();
    cleanup(now);
    const rec = attempts.get(key);
    return !!rec && rec.resetAt > now && rec.count >= limit;
  }

  function note(key) {
    const now = Date.now();
    cleanup(now);
    const rec = attempts.get(key);
    if (rec && rec.resetAt > now) {
      rec.count += 1;
    } else {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
    }
  }

  return { check, note };
}

export function validateUsername(username) {
  if (typeof username !== 'string') return 'Username is required.';
  const u = username.trim();
  if (u.length < 2) return 'Username must be at least 2 characters.';
  if (u.length > 32) return 'Username must be 32 characters or fewer.';
  if (!/^[a-zA-Z0-9_.-]+$/.test(u)) return 'Username can only use letters, numbers, and . _ -';
  return null;
}

export function validateEmail(email) {
  if (typeof email !== 'string') return 'Email is required.';
  const e = email.trim();
  if (e.length < 5 || e.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
    return 'That email address does not look right.';
  }
  return null;
}

export function validatePassword(password) {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be 128 characters or fewer.';
  return null;
}

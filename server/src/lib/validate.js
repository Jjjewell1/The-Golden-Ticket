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

export function validateDisplayName(name) {
  if (name === null || name === undefined || name === '') return null;
  if (typeof name !== 'string') return 'Display name must be text.';
  const n = name.trim();
  if (n.length > 40) return 'Display name must be 40 characters or fewer.';
  if (/[\u0000-\u001F\u007F]/.test(n)) return 'Display name has invalid characters.';
  return null;
}

export function validateBannerTagline(tagline) {
  if (tagline === null || tagline === undefined || tagline === '') return null;
  if (typeof tagline !== 'string') return 'Tagline must be text.';
  const t = tagline.trim();
  if (t.length > 120) return 'Tagline must be 120 characters or fewer.';
  if (/[\u0000-\u001F\u007F]/.test(t)) return 'Tagline has invalid characters.';
  return null;
}

export function validateAnnouncements(list) {
  if (list === null || list === undefined) return null;
  if (!Array.isArray(list)) return 'Announcements must be a list.';
  if (list.length > 10) return 'Up to 10 announcements allowed.';
  for (const a of list) {
    if (!a || typeof a !== 'object') return 'Invalid announcement.';
    const title = String(a.title || '').trim();
    const body = String(a.body || '').trim();
    if (!title) return 'Each announcement needs a title.';
    if (title.length > 80) return 'Announcement titles are limited to 80 characters.';
    if (body.length > 300) return 'Announcement text is limited to 300 characters.';
  }
  return null;
}

export function validatePassword(password) {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be 128 characters or fewer.';
  return null;
}

export function validatePin(pin) {
  if (pin === null || pin === undefined || pin === '') return null;
  if (typeof pin !== 'string') return 'PIN must be 4 digits.';
  const p = pin.trim();
  if (!/^\d{4}$/.test(p)) return 'PIN must be exactly 4 digits.';
  return null;
}

export function validateMessageTitle(title) {
  if (typeof title !== 'string' || !title.trim()) return 'Give the message a title.';
  const t = title.trim();
  if (t.length > 80) return 'Titles are limited to 80 characters.';
  if (/[\u0000-\u001F\u007F]/.test(t)) return 'Title has invalid characters.';
  return null;
}

export function validateMessageBody(body) {
  if (typeof body !== 'string' || !body.trim()) return 'Write a short message.';
  const b = body.trim();
  if (b.length > 300) return 'Messages are limited to 300 characters.';
  if (/[\u0000-\u001F\u007F]/.test(b)) return 'Message has invalid characters.';
  return null;
}

export function validateMessageLink(link) {
  if (link === null || link === undefined || link === '') return null;
  if (typeof link !== 'string') return 'Link must be text.';
  const l = link.trim();
  if (l.length > 500) return 'Link is too long.';
  if (!/^\/[\w/.\-?=&]*$/.test(l) && !/^https?:\/\//i.test(l)) {
    return 'Link should start with / or http(s)://';
  }
  return null;
}

export function validateMessageImage(image) {
  if (image === null || image === undefined || image === '') return null;
  if (typeof image !== 'string') return 'Image must be a URL.';
  const i = image.trim();
  if (i.length > 500) return 'Image URL is too long.';
  if (!/^https?:\/\//i.test(i)) return 'Image must be a full http(s) URL.';
  return null;
}

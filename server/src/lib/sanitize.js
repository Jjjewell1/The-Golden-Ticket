export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, pinHash, ...rest } = u;
  return { ...rest, hasPin: !!pinHash };
}

export async function provision({ jellyfin, romm, username, email, password }) {
  const created = { jellyfin: false, romm: false };
  const errors = [];
  try {
    await jellyfin.ensureUserPassword(username, password);
    created.jellyfin = true;
  } catch (err) {
    errors.push({ service: 'jellyfin', message: err.message });
  }
  try {
    await romm.ensureUserPassword(username, email, password);
    created.romm = true;
  } catch (err) {
    errors.push({ service: 'romm', message: err.message });
  }
  return { created, errors };
}

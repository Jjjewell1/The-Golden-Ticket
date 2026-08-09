// Outbound fetches to Jellyfin/RomM/Seerr/Linkwarden and other services must
// never hang. A service that accepts the connection but stalls (or a black-holed
// route) would otherwise keep API endpoints pending forever, which leaves the
// frontend stuck on its loading splash. Every service request goes through here.
export function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  return fetch(url, { ...options, signal });
}

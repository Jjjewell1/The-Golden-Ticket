// PWA install detection helpers. Used by InstallHint + NotifyBell to guide
// members through installing the site (required for push on iPhone/iPad).

export function isIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIphone = /iPhone|iPod/.test(ua);
  const isIpad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIphone || isIpad;
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = navigator.standalone === true;
  return mq || iosStandalone;
}

// Browsers that can install a PWA: iOS Safari (manual) + Chrome/Edge (beforeinstallprompt).
export function canInstall() {
  if (typeof window === 'undefined') return false;
  return isIos() || 'onbeforeinstallprompt' in window;
}

// True when running in a browser tab on a device that could install the PWA.
export function needsInstall() {
  return canInstall() && !isStandalone();
}

export function showInstallHint() {
  window.dispatchEvent(new CustomEvent('goldenticket:install-hint'));
}

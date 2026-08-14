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

export function detectDevice() {
  if (isIos()) return 'ios';
  if (typeof navigator === 'undefined') return 'desktop';
  return /Android/i.test(navigator.userAgent || '') ? 'android' : 'desktop';
}

// Major iOS version (0 when not iOS). Safari moved its toolbar to the bottom
// of the screen on iOS 16+.
export function iosVersion() {
  if (typeof navigator === 'undefined' || !isIos()) return 0;
  const m = (navigator.userAgent || '').match(/OS (\d+)_/);
  return m ? parseInt(m[1], 10) : 0;
}

// Which engine is running on iOS (all iOS browsers use WebKit, but their
// toolbars are placed slightly differently).
export function iosBrowser() {
  if (typeof navigator === 'undefined' || !isIos()) return 'other';
  const ua = navigator.userAgent || '';
  if (/CriOS/.test(ua)) return 'chrome';
  if (/FxiOS/.test(ua)) return 'firefox';
  return 'safari';
}

export function androidBrowser() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/EdgA/i.test(ua)) return 'edge';
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Firefox/i.test(ua)) return 'firefox';
  if (/Chrome/i.test(ua)) return 'chrome';
  return 'other';
}

// Web Share API availability (used for the "try the share sheet" fallback).
export function canShareSheet() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/* ---------- global beforeinstallprompt capture ---------- */

// Stash the latest install prompt so any "Add to Home Screen" button can fire
// the native prompt — even if the install popup was dismissed earlier.
let deferredPrompt = null;

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function consumeDeferredPrompt() {
  const p = deferredPrompt;
  deferredPrompt = null;
  return p;
}

function onBeforeInstall(e) {
  e.preventDefault();
  deferredPrompt = e;
}

if (typeof window !== 'undefined' && 'onbeforeinstallprompt' in window) {
  window.addEventListener('beforeinstallprompt', onBeforeInstall);
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

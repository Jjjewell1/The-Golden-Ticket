import { useEffect, useRef, useState } from 'react';
import { isIos, needsInstall } from '../lib/install.js';

const LS_KEY = 'goldenticket-install-hint-dismissed';

export default function InstallHint() {
  const [open, setOpen] = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('goldenticket:install-hint', show);
    return () => window.removeEventListener('goldenticket:install-hint', show);
  }, []);

  useEffect(() => {
    if (!needsInstall()) return;
    if (localStorage.getItem(LS_KEY)) return;

    // Auto-show once per browser, after a beat so the page settles first.
    const timer = setTimeout(() => setOpen(true), 1600);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
    };
    const onInstalled = () => {
      localStorage.setItem(LS_KEY, '1');
      setOpen(false);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem(LS_KEY, '1');
    setOpen(false);
  };

  const install = async () => {
    if (!deferredPrompt.current) return;
    const prompt = deferredPrompt.current;
    deferredPrompt.current = null;
    prompt.prompt();
    try {
      await prompt.userChoice;
    } catch {
      // user dismissed the native prompt — keep the popup open
      return;
    }
    localStorage.setItem(LS_KEY, '1');
    setOpen(false);
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Install The Golden Ticket">
      <div className="modal-card modal-card-narrow install-hint">
        <button className="modal-close" onClick={dismiss} aria-label="Dismiss">
          ✕
        </button>
        <div className="notify-card-icon" aria-hidden="true">
          🎫
        </div>
        <h2 className="notify-prompt-title">Make The Golden Ticket an app</h2>

        {isIos() ? (
          <>
            <p className="notify-prompt-text">
              To get notifications on iPhone or iPad, add the site to your Home Screen first:
            </p>
            <ol className="install-steps">
              <li>
                Tap <strong>Share</strong> <span className="install-kbd" aria-hidden="true">⎋</span> in
                Safari
              </li>
              <li>
                Choose <strong>Add to Home Screen</strong>
              </li>
              <li>Tap the app icon to open it</li>
              <li>
                Then tap the <strong>🔔 bell</strong> to allow notifications
              </li>
            </ol>
          </>
        ) : (
          <>
            <p className="notify-prompt-text">
              Install The Golden Ticket so it opens like a real app — full screen with its own icon.
            </p>
            {deferredPrompt.current ? (
              <button className="btn btn-gold btn-lg install-hint-action" onClick={install}>
                Install
              </button>
            ) : (
              <ol className="install-steps">
                <li>
                  Tap the <strong>⋮</strong> menu (Chrome) or the{' '}
                  <strong>⊕ install icon</strong> in the address bar (Edge)
                </li>
                <li>
                  Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>
                </li>
              </ol>
            )}
          </>
        )}

        <div className="notify-prompt-actions">
          {deferredPrompt.current ? null : (
            <button className="btn btn-ghost" onClick={dismiss}>
              Not now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

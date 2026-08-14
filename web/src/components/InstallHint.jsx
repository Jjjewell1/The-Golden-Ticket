import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  needsInstall,
  isStandalone,
  detectDevice,
  androidBrowser,
  getDeferredPrompt,
  consumeDeferredPrompt,
} from '../lib/install.js';

const LS_KEY = 'goldenticket-install-hint-dismissed';
const LS_NUDGE = 'goldenticket-standalone-nudge';

function ShareGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

function AndroidBar({ onMenu }) {
  const browser = androidBrowser();
  const glyph = browser === 'edge' ? '⊕' : '⋮';
  const aria = browser === 'edge' ? 'Tap the install icon' : 'Tap the menu';
  return (
    <div className="device-bar device-bar-android">
      <span className="device-url">
        <span className="device-lock">🔒</span>
        <span className="device-url-text">goldenticket.jewellcore.com</span>
      </span>
      <button type="button" className="device-ctl device-share" onClick={onMenu} aria-label={aria}>
        {glyph}
      </button>
      <span className="device-pointer" aria-hidden="true">↑</span>
    </div>
  );
}

function SheetMock({ rows, onHot }) {
  return (
    <div className="device-sheet">
      {rows.map((r) => (
        <div
          key={r.label}
          className={`device-sheet-row${r.hot ? ' device-sheet-hot' : ''}`}
          onClick={r.hot ? onHot : undefined}
          role={r.hot ? 'button' : undefined}
          tabIndex={r.hot ? 0 : undefined}
          onKeyDown={r.hot ? (e) => e.key === 'Enter' && onHot() : undefined}
        >
          <span className="device-sheet-ico">{r.icon}</span> {r.label}
        </div>
      ))}
    </div>
  );
}

function HomeIconMock() {
  return (
    <div className="device-home-mock">
      <span className="device-home-icon">🎫</span>
      <span className="device-home-label">The Golden Ticket</span>
    </div>
  );
}

function StepDots({ step }) {
  return (
    <div className="install-steps-dots">
      {[0, 1, 2].map((i) => (
        <span key={i} data-on={step === i} />
      ))}
    </div>
  );
}

const IOS_SHEET_ROWS = [
  { label: 'Add to Home Screen', icon: '＋', hot: true },
  { label: 'Add Bookmark', icon: '🔖' },
  { label: 'Markup', icon: '✎' },
  { label: 'More…', icon: '⋯' },
];

const ANDROID_SHEET_ROWS = [
  { label: 'Install app', icon: '＋', hot: true },
  { label: 'Add to Home screen', icon: '🏠' },
  { label: 'Share…', icon: '📤' },
  { label: 'Copy link', icon: '🔗' },
];

export default function InstallHint() {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [step, setStep] = useState(0);
  const [manual, setManual] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const show = () => {
      setStep(0);
      setManual(false);
      setOpen(true);
    };
    window.addEventListener('goldenticket:install-hint', show);
    return () => window.removeEventListener('goldenticket:install-hint', show);
  }, []);

  // First launch as an installed app: point at the bell so notifications
  // actually get turned on.
  useEffect(() => {
    if (!isStandalone() || localStorage.getItem(LS_NUDGE)) return;
    const timer = setTimeout(() => {
      localStorage.setItem(LS_NUDGE, '1');
      setNudge(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!needsInstall()) return;
    if (localStorage.getItem(LS_KEY)) return;
    const timer = setTimeout(() => setOpen(true), 1600);
    const onInstalled = () => {
      localStorage.setItem(LS_KEY, '1');
      setOpen(false);
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!open && !nudge) return null;

  const dismiss = () => {
    localStorage.setItem(LS_KEY, '1');
    setOpen(false);
  };

  const next = () => setStep((s) => Math.min(s + 1, 2));

  if (nudge) {
    return (
      <div className="modal" role="dialog" aria-modal="true" aria-label="Welcome to the app">
        <div className="modal-card modal-card-narrow install-hint">
          <div className="notify-card-icon" aria-hidden="true">
            🎉
          </div>
          <h2 className="notify-prompt-title">You&apos;re in the app!</h2>
          <p className="notify-prompt-text">
            Notifications work now. Head to the Guide and tap the bell so we can ping you when something new
            lands.
          </p>
          <div className="notify-prompt-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setNudge(false)}>
              Later
            </button>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => {
                setNudge(false);
                navigate('/guide');
              }}
            >
              Show me the bell
            </button>
          </div>
        </div>
      </div>
    );
  }

  const device = detectDevice();
  const promptAvailable = !!getDeferredPrompt();
  const iosMode = device === 'ios';
  const androidMode = device === 'android';
  const showManual = !androidMode || !promptAvailable || manual;
  const browserName = iosMode ? 'Safari' : androidBrowser() === 'edge' ? 'Edge' : androidBrowser() === 'samsung' ? 'Samsung Internet' : androidBrowser() === 'firefox' ? 'Firefox' : 'Chrome';

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Install The Golden Ticket">
      <div className="modal-card modal-card-narrow install-hint">
        <button type="button" className="modal-close" onClick={dismiss} aria-label="Dismiss">
          ✕
        </button>
        <div className="notify-card-icon" aria-hidden="true">
          🎫
        </div>
        <h2 className="notify-prompt-title">Make The Golden Ticket an app</h2>

        {iosMode ? (
          <div className="ios-guide">
            <p className="notify-prompt-text">
              Tap the <strong>Share</strong> button in Safari — the square with the up arrow at the
              bottom of your screen:
            </p>

            <div className="safari-toolbar" aria-hidden="true">
              <span className="safari-ctl">‹</span>
              <span className="safari-ctl">›</span>
              <span className="safari-url">
                <span className="device-lock">🔒</span>
                <span className="device-url-text">goldenticket.jewellcore.com</span>
              </span>
              <span className="safari-share">
                <ShareGlyph />
                <span className="safari-share-arrow">↑</span>
              </span>
              <span className="safari-tabs">
                <span></span>
                <span></span>
              </span>
              <span className="safari-ctl">☰</span>
            </div>

            <div className="ios-step">
              <strong className="ios-step-title">Then tap &quot;Add to Home Screen&quot;</strong>
              <SheetMock rows={IOS_SHEET_ROWS} />
              <p className="ios-tip">
                On some iPhones it&apos;s under the <strong>⋯ More</strong> button at the end of the row.
              </p>
            </div>

            <div className="ios-step">
              <strong className="ios-step-title">Then open it like an app</strong>
              <HomeIconMock />
              <p className="ios-tip">
                Tap the 🎫 icon on your Home Screen, then tap the 🔔 bell on the Guide to allow
                notifications.
              </p>
            </div>

            <div className="notify-prompt-actions">
              <button type="button" className="btn btn-ghost" onClick={dismiss}>
                Not now
              </button>
            </div>
          </div>
        ) : androidMode ? (
          <div className="android-guide">
            {promptAvailable && (
              <>
                <p className="notify-prompt-text">
                  One tap — Chrome will install it right away. You just confirm once.
                </p>
                <button
                  type="button"
                  className="btn btn-gold btn-lg install-hint-action"
                  onClick={async () => {
                    const prompt = consumeDeferredPrompt();
                    if (!prompt) return;
                    prompt.prompt();
                    try {
                      await prompt.userChoice;
                    } catch {
                      return;
                    }
                    localStorage.setItem(LS_KEY, '1');
                    setOpen(false);
                  }}
                >
                  Install app
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-small install-manual-toggle"
                  onClick={() => setManual(true)}
                >
                  Show me the manual way →
                </button>
              </>
            )}

            {showManual && (
              <>
                <p className="notify-prompt-text">
                  No install button in your browser? No problem — do it by hand in {browserName}:
                </p>

                {step === 0 && (
                  <div className="android-step">
                    <strong className="android-step-title">Step 1 — open the menu</strong>
                    <AndroidBar onMenu={next} />
                    <p className="android-tip">
                      {androidBrowser() === 'edge'
                        ? 'Tap the ⊕ install icon in the address bar.'
                        : 'Tap the three-dot menu in the top corner.'}
                    </p>
                  </div>
                )}

                {step === 1 && (
                  <div className="android-step">
                    <strong className="android-step-title">Step 2 — choose &quot;Install app&quot;</strong>
                    <SheetMock rows={ANDROID_SHEET_ROWS} onHot={next} />
                    <p className="android-tip">
                      Chrome and Samsung call it &quot;Add to Home screen&quot; on some phones — same thing.
                    </p>
                  </div>
                )}

                {step === 2 && (
                  <div className="android-step">
                    <strong className="android-step-title">Step 3 — open the app</strong>
                    <HomeIconMock />
                    <p className="android-tip">
                      Tap its icon to open it full-screen, then tap the 🔔 bell on the Guide to allow
                      notifications.
                    </p>
                  </div>
                )}

                <StepDots step={step} />
                <div className="notify-prompt-actions">
                  {step > 0 && (
                    <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
                      Back
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={dismiss}>
                    Not now
                  </button>
                  <button type="button" className="btn btn-gold" onClick={() => (step < 2 ? next() : dismiss())}>
                    {step < 2 ? 'Next' : "I've added it"}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="notify-prompt-text">
              Install The Golden Ticket so it opens like a real app — full screen with its own icon.
            </p>
            {promptAvailable ? (
              <button
                type="button"
                className="btn btn-gold btn-lg install-hint-action"
                onClick={async () => {
                  const prompt = consumeDeferredPrompt();
                  if (!prompt) return;
                  prompt.prompt();
                  try {
                    await prompt.userChoice;
                  } catch {
                    return;
                  }
                  localStorage.setItem(LS_KEY, '1');
                  setOpen(false);
                }}
              >
                Install
              </button>
            ) : (
              <ol className="install-steps">
                <li>
                  Tap the <strong>⋮</strong> menu (Chrome) or the <strong>⊕ install icon</strong> in the
                  address bar (Edge)
                </li>
                <li>
                  Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>
                </li>
              </ol>
            )}
            <div className="notify-prompt-actions">
              {promptAvailable ? null : (
                <button type="button" className="btn btn-ghost" onClick={dismiss}>
                  Not now
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

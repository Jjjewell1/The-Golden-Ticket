import { useEffect, useState } from 'react';
import { getConfig } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

export default function NotifyPrompt() {
  const { user, updateProfile } = useAuth();
  const [subscribeUrl, setSubscribeUrl] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'member' || !user.notifyPrompt) return;
    let alive = true;
    getConfig()
      .then((c) => {
        if (alive && c?.notify?.subscribeUrl) {
          setSubscribeUrl(c.notify.subscribeUrl);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    updateProfile({ notifyPromptSeen: true }).catch(() => {});
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card modal-card-narrow notify-prompt">
        <button className="modal-close" onClick={dismiss} aria-label="Dismiss">
          ✕
        </button>
        <div className="notify-card-icon" aria-hidden="true">
          🔔
        </div>
        <h2 className="notify-prompt-title">Never miss the good stuff</h2>
        <p className="notify-prompt-text">
          We ping the whole crew whenever new movies, shows, or games land. Grab the free{' '}
          <strong>ntfy</strong> app and subscribe so you&apos;re the first to know.
        </p>
        <div className="notify-prompt-actions">
          <a
            className="btn btn-gold"
            href={subscribeUrl}
            target="_blank"
            rel="noreferrer"
            onClick={dismiss}
          >
            Subscribe
          </a>
          <button className="btn btn-ghost" onClick={dismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

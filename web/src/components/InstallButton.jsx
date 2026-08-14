import { useState } from 'react';
import {
  needsInstall,
  detectDevice,
  getDeferredPrompt,
  consumeDeferredPrompt,
  showInstallHint,
} from '../lib/install.js';

// "Add to Home Screen" button. On Chromium (Android/desktop) it fires the
// native install prompt directly; on iOS it opens the visual guide (Apple
// exposes no API to install programmatically).
export default function InstallButton({ className = '', onClick, label = 'Add to Home Screen' }) {
  const [show] = useState(() => needsInstall());
  if (!show) return null;

  const handle = async () => {
    onClick?.();
    const prompt = getDeferredPrompt();
    if (prompt && detectDevice() !== 'ios') {
      consumeDeferredPrompt();
      prompt.prompt();
      try {
        await prompt.userChoice;
      } catch {
        // user dismissed the native prompt — nothing more to do here
      }
      return;
    }
    showInstallHint();
  };

  return (
    <button type="button" className={`btn btn-gold btn-small install-add ${className}`.trim()} onClick={handle}>
      📲 {label}
    </button>
  );
}

import { Router } from 'express';
import { page } from '../lib/page.js';

export function resetRouter({ store }) {
  const router = Router();

  router.get('/reset/:token', (req, res) => {
    const user = store.peekResetToken(req.params.token);
    res.set('Content-Type', 'text/html; charset=utf-8');

    if (!user) {
      return res.send(
        page('Link not valid', '<p>This reset link is invalid or it has expired (links are good for 15 minutes). Ask for a new one from the sign-in page.</p>'),
      );
    }

    return res.send(
      page('Set a new password', `
        <p>Setting a new password for <strong>${user.username}</strong>. It will also be synced to Jellyfin and RomM.</p>
        <input type="password" id="pw1" placeholder="New password (8+ characters)">
        <input type="password" id="pw2" placeholder="Type it again">
        <div class="row"><button class="primary" id="go">Update password</button></div>
        <div id="result"></div>
        <script>
          const token = ${JSON.stringify(req.params.token)};
          document.getElementById('go').addEventListener('click', async () => {
            const pw1 = document.getElementById('pw1').value;
            const pw2 = document.getElementById('pw2').value;
            const el = document.getElementById('result');
            el.className = '';
            if (pw1.length < 8) { el.className='err'; el.textContent='Password must be at least 8 characters.'; return; }
            if (pw1 !== pw2) { el.className='err'; el.textContent='Passwords do not match.'; return; }
            el.textContent = 'Working...';
            try {
              const r = await fetch('/api/auth/reset/' + encodeURIComponent(token), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pw1 }),
              });
              const data = await r.json().catch(() => ({}));
              if (r.ok) { el.className='ok'; el.textContent='Password updated! You can now sign in.'; }
              else { el.className='err'; el.textContent = data.error || 'Something went wrong.'; }
            } catch {
              el.className = 'err';
              el.textContent = 'Could not reach the server.';
            }
          });
        </script>`),
    );
  });

  return router;
}

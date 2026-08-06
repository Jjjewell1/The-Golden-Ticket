import { Router } from 'express';
import { verifyPayload } from '../lib/crypto.js';
import { page } from '../lib/page.js';

function fmt(d) {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date) ? '' : date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export function approveRouter({ store, secret }) {
  const router = Router();

  router.get('/owner/approve/:token', (req, res) => {
    const payload = verifyPayload(req.params.token, secret);
    const valid = payload && payload.req && payload.exp && payload.exp > Date.now();
    const reqObj = valid ? store.findRequestById(payload.req) : null;

    res.set('Content-Type', 'text/html; charset=utf-8');

    if (!valid || !reqObj) {
      return res.send(
        page('Link not valid', '<p>The link you used is not valid or it has expired. A fresh link is sent each time someone asks for a ticket.</p>'),
      );
    }

    if (reqObj.status !== 'pending') {
      const label = reqObj.status === 'approved' ? 'approved' : 'denied';
      return res.send(
        page('Already handled', `<p>This request for <strong>${reqObj.username}</strong> (${reqObj.email}) was already <strong>${label}</strong>${reqObj.decidedAt ? ' on ' + fmt(reqObj.decidedAt) : ''}.</p><p>You can also manage everything from the owner panel on the site.</p>`),
      );
    }

    return res.send(
      page('New ticket request', `
        <h2>${reqObj.username} wants a Golden Ticket</h2>
        <p class="meta">${reqObj.email} · requested ${fmt(reqObj.requestedAt)}</p>
        <p>Approving creates a Jellyfin + RomM account with the username and password they chose, then emails them.</p>
        <textarea id="note" placeholder="Optional note to the person (shown if denied)"></textarea>
        <div class="row">
          <button class="primary" id="approve">Approve</button>
          <button class="danger" id="deny">Deny</button>
        </div>
        <div id="result"></div>
        <script>
          const token = ${JSON.stringify(req.params.token)};
          const note = () => document.getElementById('note').value.trim();
          function submit(action) {
            const el = document.getElementById('result');
            el.className = '';
            el.textContent = 'Working...';
            fetch('/api/owner/decision-link/' + encodeURIComponent(token), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action, note: note() }),
            }).then(async (r) => {
              const data = await r.json().catch(() => ({}));
              if (r.ok) {
                el.className = 'ok';
                el.textContent = action === 'approve' ? 'Approved — they have been emailed.' : 'Denied — they have been emailed.';
              } else {
                el.className = 'err';
                el.textContent = data.error || 'Something went wrong.';
              }
            }).catch(() => {
              el.className = 'err';
              el.textContent = 'Could not reach the server.';
            });
          }
          document.getElementById('approve').addEventListener('click', () => submit('approve'));
          document.getElementById('deny').addEventListener('click', () => submit('deny'));
        </script>`),
    );
  });

  return router;
}

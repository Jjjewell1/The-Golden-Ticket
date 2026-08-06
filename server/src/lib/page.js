export function page(title, inner) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · The Golden Ticket</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,Segoe UI,Roboto,sans-serif; background:#0e0d1a; color:#e9e6ff; display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
  .card { background:#1b1933; border:1px solid #2e2a4d; border-radius:16px; padding:32px; max-width:520px; width:100%; }
  h2 { margin:0 0 8px; color:#fff; }
  p { line-height:1.6; color:#b9b4d6; margin:8px 0; }
  .meta { font-size:13px; color:#8a84ad; }
  textarea, input { width:100%; margin:10px 0; padding:12px 14px; border-radius:10px; border:1px solid #3a3663; background:#12101f; color:#fff; font:inherit; }
  textarea { min-height:80px; resize:vertical; }
  .row { display:flex; gap:12px; margin-top:14px; }
  button { flex:1; padding:12px; border:none; border-radius:10px; font:inherit; font-weight:600; cursor:pointer; }
  .primary { background:#7c3aed; color:#fff; }
  .danger { background:#b91c1c; color:#fff; }
  #result { margin-top:14px; font-size:14px; }
  .ok { color:#4ade80; }
  .err { color:#f87171; }
  a { color:#a78bfa; }
</style>
</head>
<body>
  <div class="card">
    <div style="font-size:28px;margin-bottom:6px">🎫</div>
    ${inner}
  </div>
</body>
</html>`;
}

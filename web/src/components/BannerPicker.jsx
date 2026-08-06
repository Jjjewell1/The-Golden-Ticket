import { useRef, useState } from 'react';

const MAX_DIM = 1600;

function fileToBanner(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BannerPicker({ value, onChange }) {
  const fileRef = useRef(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErr('That file is not an image.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const dataUrl = await fileToBanner(file);
      onChange(dataUrl);
    } catch {
      setErr('Could not read that image. Try a different one.');
    } finally {
      setBusy(false);
    }
  }

  function useUrl(e) {
    e.preventDefault();
    const u = url.trim();
    setErr('');
    if (!u) {
      setErr('Enter an image URL first.');
      return;
    }
    if (!/^https?:\/\//i.test(u)) {
      setErr('That URL does not look right (needs http:// or https://).');
      return;
    }
    onChange(u);
  }

  return (
    <div className="banner-picker">
      <div className="banner-picker-preview">
        {value ? <img src={value} alt="" /> : <span className="banner-picker-empty">🎬 No banner set</span>}
      </div>

      <div className="banner-picker-actions">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Resizing…' : '📷 Upload an image'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
        {value ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={() => onChange('')}>
            ✖️ Remove
          </button>
        ) : null}
      </div>

      <form className="banner-picker-url" onSubmit={useUrl}>
        <input
          type="text"
          placeholder="…or paste an image URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" className="btn btn-ghost btn-small">
          Use URL
        </button>
      </form>

      {err ? <span className="field-hint banner-picker-err">{err}</span> : null}
      <span className="field-hint">A wide image (16:9 or wider) looks best. Large photos are shrunk automatically.</span>
    </div>
  );
}

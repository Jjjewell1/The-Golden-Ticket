import { useRef, useState } from 'react';
import Avatar from './Avatar.jsx';

const MAX_DIM = 256;

function fileToAvatar(file) {
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
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AvatarPicker({ value, onChange, palette = [], name }) {
  const fileRef = useRef(null);
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
      const dataUrl = await fileToAvatar(file);
      onChange(dataUrl);
    } catch {
      setErr('Could not read that image. Try a different one.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="avatar-picker">
      <div className="avatar-picker-current">
        <Avatar avatar={value} name={name || '?'} size={72} />
      </div>

      <div className="avatar-picker-grid">
        {palette.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`avatar-tile avatar-opt${value === emoji ? ' is-selected' : ''}`}
            onClick={() => onChange(emoji)}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="avatar-picker-actions">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Resizing…' : '📷 Upload a photo'}
        </button>
        {value ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={() => onChange('')}>
            ✖️ Use initials
          </button>
        ) : null}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
      </div>
      {err ? <span className="field-hint avatar-picker-err">{err}</span> : null}
      <span className="field-hint">Photos are shrunk to a small square before saving.</span>
    </div>
  );
}

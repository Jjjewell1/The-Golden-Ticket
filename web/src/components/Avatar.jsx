export default function Avatar({ avatar, name, size = 40, className = '', title }) {
  const display = name || '?';
  const initial = Array.from(display.replace(/\s+/g, ' ').trim())[0] || '?';
  const style = { width: size, height: size, fontSize: Math.round(size * 0.46) };

  if (avatar && avatar.startsWith('data:image/')) {
    return (
      <img
        className={`avatar avatar-img${className ? ` ${className}` : ''}`}
        src={avatar}
        alt={display}
        title={title ?? display}
        style={style}
      />
    );
  }

  return (
    <span
      className={`avatar avatar-tile${className ? ` ${className}` : ''}`}
      title={title ?? display}
      style={style}
      aria-hidden="true"
    >
      {avatar || initial}
    </span>
  );
}

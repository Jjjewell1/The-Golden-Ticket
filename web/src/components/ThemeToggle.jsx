export default function ThemeToggle({ theme, onToggle, className = '' }) {
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={onToggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb">{theme === 'dark' ? '🌙' : '☀️'}</span>
      </span>
      <span className="theme-toggle-label">{next === 'light' ? 'Light' : 'Dark'} mode</span>
    </button>
  );
}

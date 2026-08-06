import ThemeToggle from './ThemeToggle.jsx';

export default function Topbar({ theme, onToggleTheme, onMenu }) {
  return (
    <header className="topbar">
      <button type="button" className="topbar-burger" onClick={onMenu} aria-label="Open menu">
        <span />
        <span />
        <span />
      </button>
      <span className="topbar-brand">The Golden Ticket</span>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} className="theme-toggle-topbar" />
    </header>
  );
}

import ThemeToggle from './ThemeToggle.jsx';
import Avatar from './Avatar.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function Topbar({ theme, onToggleTheme, onMenu }) {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <button type="button" className="topbar-burger" onClick={onMenu} aria-label="Open menu">
        <span />
        <span />
        <span />
      </button>
      <span className="topbar-brand">The Golden Ticket</span>
      <div className="topbar-right">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} className="theme-toggle-topbar" />
        {user && (
          <div className="topbar-user">
            <Avatar avatar={user.avatar} name={user.displayName || user.username} size={30} />
            <span className="topbar-user-name">{user.displayName || user.username}</span>
            <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

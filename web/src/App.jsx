import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './lib/theme.jsx';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import Background from './components/Background.jsx';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Footer from './components/Footer.jsx';
import InstallHint from './components/InstallHint.jsx';
import NotifySync from './components/NotifySync.jsx';
import Home from './pages/Home.jsx';
import Movies from './pages/Movies.jsx';
import Games from './pages/Games.jsx';
import Bookmarks from './pages/Bookmarks.jsx';
import Requests from './pages/Requests.jsx';
import RecentlyAdded from './pages/RecentlyAdded.jsx';
import Signup from './pages/Signup.jsx';
import Login from './pages/Login.jsx';
import Forgot from './pages/Forgot.jsx';
import Guide from './pages/Guide.jsx';
import Owner from './pages/Owner.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { user, loading } = useAuth();
  useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="app app-auth">
        <Background />
        <div className="auth-splash">
          <div className="auth-card-icon" aria-hidden="true">🎫</div>
          <p className="auth-splash-text">Checking your ticket…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app app-auth">
        <Background />
        <main className="main auth-main">
          <Routes>
            <Route path="/get-my-ticket" element={<Signup />} />
            <Route path="/forgot" element={<Forgot />} />
            <Route path="*" element={<Login />} />
          </Routes>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Background />
      <InstallHint />
      <NotifySync />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Topbar onMenu={() => setMenuOpen((o) => !o)} />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/games" element={<Games />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/recently-added" element={<RecentlyAdded />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/owner" element={<Owner />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/get-my-ticket" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/forgot" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

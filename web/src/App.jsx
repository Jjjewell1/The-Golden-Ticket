import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTheme } from './lib/theme.jsx';
import Background from './components/Background.jsx';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Movies from './pages/Movies.jsx';
import Games from './pages/Games.jsx';
import Requests from './pages/Requests.jsx';
import Signup from './pages/Signup.jsx';
import Guide from './pages/Guide.jsx';
import Owner from './pages/Owner.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app">
      <Background />
      <Sidebar theme={theme} onToggleTheme={toggle} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Topbar theme={theme} onToggleTheme={toggle} onMenu={() => setMenuOpen((o) => !o)} />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/games" element={<Games />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/get-my-ticket" element={<Signup />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/owner" element={<Owner />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

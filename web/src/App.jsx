import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Games from './pages/Games.jsx';
import Requests from './pages/Requests.jsx';
import Signup from './pages/Signup.jsx';
import Guide from './pages/Guide.jsx';
import Owner from './pages/Owner.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
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

import { Link } from 'react-router-dom';
import { TicketLogo } from './Ticket.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <TicketLogo size={22} />
          <span>The Golden Ticket</span>
        </div>
        <div className="footer-links">
          <Link to="/get-my-ticket">Get my ticket</Link>
          <Link to="/guide">Guide</Link>
          <Link to="/requests">Requests</Link>
          <Link to="/owner">Owner</Link>
        </div>
        <p className="footer-note">Made with love for friends &amp; family. 🎬</p>
      </div>
    </footer>
  );
}

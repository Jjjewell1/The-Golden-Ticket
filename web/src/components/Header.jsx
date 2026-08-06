import { Link, NavLink } from 'react-router-dom';
import { TicketLogo } from './Ticket.jsx';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/games', label: 'Games' },
  { to: '/requests', label: 'Requests' },
  { to: '/guide', label: 'Guide' },
];

export default function Header() {
  return (
    <header className="header">
      <Link to="/" className="brand">
        <TicketLogo size={34} />
        <span className="brand-name">The Golden Ticket</span>
      </Link>
      <nav className="nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {l.label}
          </NavLink>
        ))}
        <NavLink
          to="/get-my-ticket"
          className={({ isActive }) => `nav-link cta${isActive ? ' active' : ''}`}
        >
          Get my ticket
        </NavLink>
      </nav>
    </header>
  );
}

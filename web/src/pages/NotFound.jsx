import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page">
      <div className="notfound">
        <div className="notfound-icon" aria-hidden="true">🎫</div>
        <h1 className="page-title">Lost your ticket?</h1>
        <p className="page-sub">That page isn't part of the show.</p>
        <Link to="/" className="btn btn-gold">
          Back to the front door
        </Link>
      </div>
    </div>
  );
}

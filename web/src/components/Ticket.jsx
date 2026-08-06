export function TicketLogo({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={`ticket-logo ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gt-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7df8a" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#9c7f2e" />
        </linearGradient>
      </defs>
      <path
        d="M96 128 h320 a24 24 0 0 1 24 24 v48 h-40 a36 36 0 0 0 0 72 h40 v48 a24 24 0 0 1 -24 24 H96 a24 24 0 0 1 -24 -24 v-48 h40 a36 36 0 0 0 0 -72 H72 v-48 a24 24 0 0 1 24 -24 z"
        fill="url(#gt-gold)"
      />
      <rect x="232" y="88" width="48" height="336" rx="24" fill="#0b0a12" />
      <circle cx="256" cy="256" r="64" fill="#0b0a12" stroke="url(#gt-gold)" strokeWidth="14" />
      <path
        d="M256 196 l16 34 38 6 -28 26 7 38 -33 -18 -33 18 7 -38 -28 -26 38 -6 z"
        fill="#f7df8a"
      />
    </svg>
  );
}

export function TicketShape({ children, className = '' }) {
  return (
    <div className={`ticket-shape ${className}`}>
      <div className="ticket-notch ticket-notch-l" />
      <div className="ticket-body">{children}</div>
      <div className="ticket-notch ticket-notch-r" />
    </div>
  );
}

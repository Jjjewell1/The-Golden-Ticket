import { useEffect, useState } from 'react';

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function ClockWidget() {
  const now = useNow();
  const [time, period] = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).split(' ');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="sidebar-widget clock-widget">
      <span className="sidebar-widget-title">🕰️ Here &amp; now</span>
      <div className="clock-face">
        <span className="clock-time">
          {time}
          <span className="clock-seconds">{seconds}</span>
          {period && <span className="clock-period">{period}</span>}
        </span>
        <span className="clock-date">{date}</span>
      </div>
    </div>
  );
}

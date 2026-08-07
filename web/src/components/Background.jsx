/** A row of puffy clouds that drifts slowly across the sky. */
function CloudRow({ top, speed, scale, opacity }) {
  return (
    <span className="bg-cloud-row" style={{ top, opacity, animationDuration: `${speed}s` }}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="bg-cloud" style={{ left: `${i * 33}%`, transform: `scale(${scale})` }}>
          <svg viewBox="0 0 200 60" className="bg-cloud-shape">
            <ellipse cx="60" cy="40" rx="60" ry="20" />
            <ellipse cx="110" cy="30" rx="50" ry="22" />
            <ellipse cx="155" cy="42" rx="45" ry="16" />
          </svg>
        </span>
      ))}
    </span>
  );
}

export default function Background() {
  return (
    <div className="bg" aria-hidden="true">
      <span className="bg-base" />
      <span className="bg-orb bg-orb-a" />
      <span className="bg-orb bg-orb-b" />
      <span className="bg-orb bg-orb-c" />
      <span className="bg-orb bg-orb-d" />
      <span className="bg-stars" />
      <CloudRow top="12%" speed={90} scale={1.4} opacity={0.35} />
      <CloudRow top="30%" speed={130} scale={1} opacity={0.28} />
      <CloudRow top="58%" speed={170} scale={0.8} opacity={0.2} />
    </div>
  );
}

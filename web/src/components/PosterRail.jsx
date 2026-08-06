import { useEffect, useRef, useState } from 'react';

function cardGap() {
  const size = getComputedStyle(document.documentElement);
  return Number.parseFloat(size.getPropertyValue('--rail-gap')) || 18;
}

export default function PosterRail({ items, size = 'tall', auto = 0, className = '', onSelect }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const step = () => {
    const el = trackRef.current;
    if (!el) return 320;
    const card = el.querySelector('.rail-card');
    return card ? card.offsetWidth + cardGap() : 320;
  };

  const next = () => trackRef.current?.scrollBy({ left: step(), behavior: 'smooth' });
  const prev = () => trackRef.current?.scrollBy({ left: -step(), behavior: 'smooth' });

  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [items]);

  useEffect(() => {
    if (!auto) return;
    const el = trackRef.current;
    if (!el) return;
    let timer = null;
    const start = () => {
      timer = setInterval(() => {
        if (document.hidden) return;
        const max = el.scrollWidth - el.clientWidth;
        if (el.scrollLeft >= max - 8) {
          el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          el.scrollBy({ left: step(), behavior: 'smooth' });
        }
      }, auto);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    el.addEventListener('mouseenter', stop);
    el.addEventListener('mouseleave', start);
    el.addEventListener('touchstart', stop, { passive: true });
    return () => {
      stop();
      el.removeEventListener('mouseenter', stop);
      el.removeEventListener('mouseleave', start);
      el.removeEventListener('touchstart', stop);
    };
  }, [auto, items]);

  return (
    <div className={`rail ${className}`}>
      {canPrev && (
        <button type="button" className="rail-btn rail-prev" onClick={prev} aria-label="Previous">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      <div className="rail-track" ref={trackRef}>
        {items.map((it, i) => {
          const inner = (
            <>
              <span className="rail-img">
                {it.image ? (
                  <img src={it.image} alt={it.title} loading="lazy" />
                ) : (
                  <span className="rail-fallback" aria-hidden="true">
                    {it.emoji || '🎬'}
                  </span>
                )}
                {it.badge && <span className="rail-badge">{it.badge}</span>}
                {it.overlay && (
                  <span className="rail-shade">
                    <span className="rail-overlay-title">{it.title}</span>
                    {it.overlay && <span className="rail-overlay-text">{it.overlay}</span>}
                  </span>
                )}
              </span>
              <span className="rail-meta">
                <span className="rail-title">{it.title}</span>
                {it.subtitle && <span className="rail-sub">{it.subtitle}</span>}
              </span>
            </>
          );

          return onSelect ? (
            <button
              key={`${it.id ?? it.name}-${i}`}
              type="button"
              className={`rail-card rail-card-btn ${size}`}
              onClick={() => onSelect(it)}
              aria-label={`View details for ${it.title}`}
            >
              {inner}
            </button>
          ) : (
            <a key={`${it.id ?? it.name}-${i}`} href={it.href} target="_blank" rel="noreferrer" className={`rail-card ${size}`}>
              {inner}
            </a>
          );
        })}
      </div>
      {canNext && (
        <button type="button" className="rail-btn rail-next" onClick={next} aria-label="Next">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

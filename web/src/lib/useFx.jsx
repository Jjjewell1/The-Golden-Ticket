import { useEffect, useRef, useState } from 'react';

export function useReveal(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.01, rootMargin: '0px 0px -6% 0px', ...options },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, visible];
}

export function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const [ref, visible] = useReveal();
  return (
    <Tag
      ref={ref}
      className={`reveal${visible ? ' visible' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function useCountUp(target, { duration = 1500, enabled = true } = {}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);

  return value;
}

export function useTilt(max = 9) {
  const ref = useRef(null);

  const onMouseMove = (e) => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-py * max).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(px * max).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${((px + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${((py + 0.5) * 100).toFixed(1)}%`);
  };

  const onMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return { ref, onMouseMove, onMouseLeave };
}

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'gt-theme';
const THEME_COLORS = { dark: '#0d0c1d', light: '#eef0fc' };

export function getInitialTheme() {
  try {
    const forced = new URLSearchParams(window.location.search).get('theme');
    if (forced === 'light' || forced === 'dark') return forced;
  } catch {
    /* ignore */
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark);
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  };
}

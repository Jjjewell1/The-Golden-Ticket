import { useEffect, useState } from 'react';

const THEME_COLOR = '#0b1120';

export function getInitialTheme() {
  return 'dark';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR);
}

export function useTheme() {
  const [theme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return {
    theme,
    toggle: () => {},
  };
}

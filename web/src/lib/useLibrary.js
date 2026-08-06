import { useEffect, useState } from 'react';

export function useLibrary(fetcher) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    setError(null);
    fetcher()
      .then((d) => alive && setItems(d.items || []))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [fetcher]);

  return { items, error };
}

export function useFilterGroups(items, pick) {
  const groups = new Map();
  for (const item of items || []) {
    for (const value of pick(item)) {
      if (!value) continue;
      groups.set(value, (groups.get(value) || 0) + 1);
    }
  }
  return Array.from(groups.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

import { useEffect, useMemo, useState } from 'react';
import { getLinks, linkPreviewUrl } from '../lib/api.js';
import FilterToolbar from '../components/FilterToolbar.jsx';
import { Reveal } from '../lib/useFx.jsx';

const linkwardenUrl = 'https://link.jewellcore.com';

function hostOf(url) {
  if (!url) return null;
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function Bookmarks() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [collectionId, setCollectionId] = useState('all');
  const [tagId, setTagId] = useState('all');
  const debouncedQuery = useDebounced(query.trim(), 300);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setItems(null);
      setError(null);
      try {
        if (debouncedQuery) {
          const { items: results } = await getLinks(debouncedQuery);
          if (alive) setItems(results || []);
          return;
        }
        const all = [];
        let cursor;
        do {
          const page = await getLinks('', cursor);
          all.push(...(page.items || []));
          cursor = page.nextCursor;
        } while (cursor);
        if (alive) setItems(all);
      } catch (e) {
        if (alive) setError(e.message);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [debouncedQuery]);

  const collectionChips = useMemo(() => {
    const groups = new Map();
    for (const l of items || []) {
      if (!l.collection) continue;
      const prev = groups.get(l.collection.id) || { id: l.collection.id, label: l.collection.name, count: 0 };
      groups.set(l.collection.id, { ...prev, count: prev.count + 1 });
    }
    return [
      { id: 'all', label: 'All collections', count: items?.length || 0 },
      ...Array.from(groups.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    ];
  }, [items]);

  const tagChips = useMemo(() => {
    const groups = new Map();
    for (const l of items || []) {
      for (const t of l.tags || []) {
        const prev = groups.get(t.id) || { id: t.id, label: t.name, count: 0 };
        groups.set(t.id, { ...prev, count: prev.count + 1 });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((l) => {
      if (collectionId !== 'all' && String(l.collection?.id ?? '') !== String(collectionId)) return false;
      if (tagId !== 'all' && !(l.tags || []).some((t) => String(t.id) === String(tagId))) return false;
      return true;
    });
  }, [items, collectionId, tagId]);

  const reset = () => {
    setQuery('');
    setCollectionId('all');
    setTagId('all');
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Bookmarks</h1>
        <p className="page-sub">
          {items ? `${items.length} saved ${items.length === 1 ? 'link' : 'links'}${debouncedQuery ? ` matching “${debouncedQuery}”` : ''} — jump back to anything you loved.` : 'Everything you saved for later, in one place.'}
        </p>
      </div>

      {error && <div className="banner banner-error">Couldn&apos;t load bookmarks: {error}</div>}

      {!items && !error && (
        <div className="loading">
          <div className="loading-ticket">📑</div>
          <p>Opening your saved links…</p>
        </div>
      )}

      {items && (
        <>
          <Reveal>
            <FilterToolbar
              placeholder="Search bookmarks…"
              query={query}
              onQuery={setQuery}
              chips={collectionChips}
              active={collectionId}
              onSelect={setCollectionId}
            />
          </Reveal>

          {tagChips.length > 0 && (
            <Reveal delay={40}>
              <div className="tag-row">
                <button
                  type="button"
                  className={`chip${tagId === 'all' ? ' active' : ''}`}
                  onClick={() => setTagId('all')}
                >
                  <span>All tags</span>
                  <span className="chip-count">{items.length}</span>
                </button>
                {tagChips.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`chip${tagId === String(t.id) ? ' active' : ''}`}
                    onClick={() => setTagId(String(t.id))}
                  >
                    <span>{t.label}</span>
                    <span className="chip-count">{t.count}</span>
                  </button>
                ))}
              </div>
            </Reveal>
          )}

          <div className="library-count">
            Showing {filtered.length} of {items.length} saved links
            {debouncedQuery ? ` · “${debouncedQuery}”` : ''}
            {collectionId !== 'all' ? ' · ' + collectionChips.find((c) => String(c.id) === String(collectionId))?.label : ''}
          </div>

          <Reveal delay={60}>
            {filtered.length === 0 ? (
              <div className="library-empty">
                <span className="library-empty-icon" aria-hidden="true">
                  🔗
                </span>
                <p className="muted">No saved links match that — try a different search or filter.</p>
                <button type="button" className="btn btn-ghost" onClick={reset}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="bookmark-grid">
                {filtered.map((l) => {
                  const target = l.url || linkwardenUrl;
                  const host = hostOf(l.url);
                  const preview = linkPreviewUrl(l);
                  return (
                    <article className="bookmark-card" key={l.id}>
                      <a
                        className="bookmark-thumb"
                        href={target}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={l.name}
                      >
                        {preview ? (
                          <img src={preview} alt="" loading="lazy" />
                        ) : (
                          <span className="bookmark-thumb-fallback" aria-hidden="true">
                            {l.icon || '🔗'}
                          </span>
                        )}
                        {l.collection && (
                          <span
                            className="bookmark-collection"
                            style={{ '--cc': l.collection.color || 'var(--accent)' }}
                          >
                            {l.collection.name}
                          </span>
                        )}
                      </a>
                      <div className="bookmark-meta">
                        <a className="bookmark-title" href={target} target="_blank" rel="noreferrer">
                          {l.name || l.url}
                        </a>
                        <span className="bookmark-host">{host || 'Saved link'}</span>
                        {l.description && <p className="bookmark-desc">{l.description}</p>}
                        {l.tags?.length > 0 && (
                          <div className="bookmark-tags">
                            {l.tags.map((t) => (
                              <span key={t.id} className="bookmark-tag">
                                #{t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Reveal>

          <div className="library-foot">
            <a href={linkwardenUrl} target="_blank" rel="noreferrer" className="btn btn-small btn-ghost">
              Open Linkwarden →
            </a>
          </div>
        </>
      )}
    </div>
  );
}

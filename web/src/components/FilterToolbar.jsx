export default function FilterToolbar({ placeholder = 'Search…', query, onQuery, chips, active, onSelect }) {
  return (
    <div className="filter-bar">
      <label className="filter-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {query && (
          <button type="button" className="filter-search-clear" onClick={() => onQuery('')} aria-label="Clear search">
            ✕
          </button>
        )}
      </label>
      <div className="filter-chips">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`chip${active === chip.id ? ' active' : ''}`}
            onClick={() => onSelect(chip.id)}
          >
            <span>{chip.label}</span>
            <span className="chip-count">{chip.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

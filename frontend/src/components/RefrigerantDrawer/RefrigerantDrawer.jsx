import React, { useState, useEffect } from "react";
import RefrigerantDataService from "../../services/refrigerantDataService";
import "./RefrigerantDrawer.css";

// Default fallback list
const DEFAULT_REFRIGERANTS = [
  'R11', 'R12', 'R13', 'R13B1', 'R14', 'R22', 'R23', 'R32', 'R41', 'R114',
  'R123', 'R1150 (Ethylene)', 'R1233zd(E)', 'R1234yf', 'R1234ze(E)', 'R124', 'R125',
  'R1270 (Propylene)', 'R1336mzz(Z)', 'R134a', 'R141b', 'R142b', 'R152a', 'R170 (Ethane)',
  'R227ea', 'R236ea', 'R236fa', 'R245fa', 'R290 (Propane)', 'R401A', 'R401B',
  'R402A', 'R402B', 'R403B', 'R404A', 'R406A', 'R407A', 'R407B', 'R407C',
  'R407F', 'R407H', 'R408A', 'R409A', 'R409B', 'R410A', 'R413A', 'R414B',
  'R416A', 'R417A', 'R417C', 'R420A', 'R421A', 'R422A', 'R422B', 'R422C',
  'R422D', 'R424A', 'R426A', 'R427A', 'R428A', 'R434A', 'R436A', 'R436B',
  'R436C', 'R437A', 'R438A', 'R441A', 'R442A', 'R443A', 'R444A', 'R444B',
  'R445A', 'R448A', 'R449A', 'R449B', 'R450A', 'R452A', 'R452B', 'R453A',
  'R454A', 'R454B', 'R454C', 'R455A', 'R458A', 'R466A', 'R469A', 'R470A',
  'R470B', 'R471A', 'R472A', 'R472B', 'R473A', 'R50 (Methane)', 'R500', 'R502',
  'R503', 'R507', 'R508B', 'R511A', 'R513A', 'R513B', 'R514A', 'R515A',
  'R515B', 'R516A', 'R600 (Butane)', 'R600a (Isobutane)', 'R601 (Pentane)',
  'R601a (Isopentane)', 'R702 (Hydrogen)', 'R717 (Ammonia)',
  'R718 (Water)', 'R723', 'R728 (Nitrogen)', 'R729 (Air)', 'R732 (Oxygen)',
  'R744 (Carbon dioxide)', 'R744A (Nitrous oxide)', 'RE170 (Dimethyl ether)'
];

const RefrigerantDrawer = ({ open, onClose, onSelect, selected, refrigerants = DEFAULT_REFRIGERANTS }) => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    // Load favorites from localStorage or keep in state
    const fav = window.localStorage.getItem("refrigerantFavorites");
    if (fav) setFavorites(JSON.parse(fav));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("refrigerantFavorites", JSON.stringify(favorites));
  }, [favorites]);

  // Calculate filtered list (must be before useEffect hooks that use it)
  const filtered = refrigerants.filter(r =>
    r.toLowerCase().includes(search.toLowerCase()) &&
    (tab === "All" || favorites.includes(r))
  );

  // Auto-focus search and scroll to selected item when drawer opens
  useEffect(() => {
    if (open) {
      // Auto-focus search input
      setTimeout(() => {
        const searchInput = document.querySelector('.drawer-search-input');
        searchInput?.focus();
      }, 100);

      // Auto-scroll to selected item
      if (selected) {
        setTimeout(() => {
          const selectedEl = document.querySelector('.drawer-list-row.selected');
          if (selectedEl) {
            selectedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 400);  // Wait for drawer animation
      }
    } else {
      setSearch("");  // Reset search when drawer closes
    }
  }, [open, selected]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const rows = Array.from(document.querySelectorAll('.drawer-list-row'));
        const selectedIndex = rows.findIndex(row => row.classList.contains('selected'));

        let newIndex;
        if (e.key === 'ArrowDown') {
          newIndex = selectedIndex < rows.length - 1 ? selectedIndex + 1 : 0;
        } else {
          newIndex = selectedIndex > 0 ? selectedIndex - 1 : rows.length - 1;
        }

        if (newIndex >= 0 && newIndex < filtered.length) {
          const newRefrigerant = filtered[newIndex];
          onSelect(newRefrigerant);
          rows[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (selected) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selected, filtered, onSelect, onClose]);

  const handleFavorite = (r) => {
    setFavorites(favorites.includes(r)
      ? favorites.filter(f => f !== r)
      : [...favorites, r]
    );

    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleSelectRefrigerant = (refrigerant) => {
    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    onSelect(refrigerant);
    onClose();
  };

  return (
    <>
      {open && <div className="drawer-overlay" onClick={onClose} />}
      <div className={`refrigerant-drawer right${open ? " open" : ""}`}>
        <div className="drawer-topbar">
          <div style={{ flex: 1 }}>
            {selected && (
              <div className="drawer-subtitle" style={{
                fontSize: '0.85rem',
                color: '#9ca3af',
                marginBottom: '2px',
                fontWeight: 500
              }}>
                Selected: <span style={{ color: '#00f2ff', fontWeight: 600 }}>{selected}</span>
              </div>
            )}
            <span className="drawer-title">Choose refrigerant</span>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close refrigerant selector">×</button>
        </div>
        <div className="drawer-searchbar">
          <span className="drawer-search-icon">🔍</span>
          <input
            className="drawer-search-input"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="drawer-filter-icon">⚙️</span>
        </div>
        <div className="drawer-tabs">
          <button
            className={`drawer-tab${tab === "All" ? " active" : ""}`}
            onClick={() => setTab("All")}
          >
            All ({refrigerants.length})
          </button>
          <button
            className={`drawer-tab${tab === "Favorites" ? " active" : ""}`}
            onClick={() => setTab("Favorites")}
          >
            Favorites ({favorites.length})
          </button>
        </div>
        <div className="drawer-list">
          {filtered.length === 0 ? (
            <div className="empty-state" style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              color: '#9ca3af'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                No refrigerants found
              </p>
              {search && (
                <>
                  <p style={{ fontSize: '1rem', marginBottom: '1rem', color: '#6b7280' }}>
                    matching "<strong style={{ color: '#00f2ff' }}>{search}</strong>"
                  </p>
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      padding: '0.6rem 1.2rem',
                      background: '#00f2ff22',
                      color: '#00f2ff',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#00f2ff33'}
                    onMouseLeave={(e) => e.target.style.background = '#00f2ff22'}
                  >
                    Clear search
                  </button>
                </>
              )}
              {tab === "Favorites" && favorites.length === 0 && !search && (
                <p style={{ fontSize: '0.95rem', marginTop: '1rem', color: '#6b7280' }}>
                  Star refrigerants to add them to favorites
                </p>
              )}
            </div>
          ) : (
            filtered.map(r => (
              <div
                key={r}
                className={`drawer-list-row${selected === r ? " selected" : ""}`}
                onClick={() => handleSelectRefrigerant(r)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selected === r && (
                    <span style={{ color: '#00f2ff', fontSize: '1.2rem', fontWeight: 'bold' }}>✓</span>
                  )}
                  <span>{r}</span>
                </div>
                <span
                  className={`drawer-star${favorites.includes(r) ? " starred" : ""}`}
                  onClick={e => { e.stopPropagation(); handleFavorite(r); }}
                  title={favorites.includes(r) ? "Remove from favorites" : "Add to favorites"}
                  aria-label={favorites.includes(r) ? "Remove from favorites" : "Add to favorites"}
                >
                  {favorites.includes(r) ? '★' : '☆'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default RefrigerantDrawer;

import React, { useState, useRef, useCallback } from 'react';

interface TopBarProps {
  onSearch: (query: string) => void;
  onExport: (format: 'xlsx' | 'csv' | 'pdf') => void;
  onBackup: () => void;
  onRestore: () => void;
  onToggleTheme: () => void;
  onToggleFilters: () => void;
  onToggleView: () => void;
  onShowShortcuts: () => void;
  theme: string;
  filtersVisible: boolean;
  currentView: 'ledger' | 'dashboard';
}

export function TopBar({
  onSearch,
  onExport,
  onBackup,
  onRestore,
  onToggleTheme,
  onToggleFilters,
  onToggleView,
  onShowShortcuts,
  theme,
  filtersVisible,
  currentView,
}: TopBarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // The query itself is debounced centrally in App; here we just keep the input
  // controlled and forward the value immediately.
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      onSearch(value);
    },
    [onSearch]
  );

  return (
    <div className="top-bar">
      {/* Brand */}
      <div className="top-bar__brand">
        <div className="top-bar__logo">L</div>
        <span className="top-bar__title">LogWise</span>
      </div>

      {/* View Toggle */}
      <div className="top-bar__view-toggle">
        <button
          className={`view-toggle__btn ${currentView === 'dashboard' ? 'view-toggle__btn--active' : ''}`}
          onClick={() => currentView !== 'dashboard' && onToggleView()}
          title="Dashboard"
        >
          <span className="material-icons-outlined">dashboard</span>
        </button>
        <button
          className={`view-toggle__btn ${currentView === 'ledger' ? 'view-toggle__btn--active' : ''}`}
          onClick={() => currentView !== 'ledger' && onToggleView()}
          title="Ledger"
        >
          <span className="material-icons-outlined">table_rows</span>
        </button>
      </div>

      {/* Search */}
      <div className="top-bar__search">
        <div className="search-input">
          <span className="search-input__icon material-icons-outlined">search</span>
          <input
            ref={searchRef}
            className="search-input__field"
            type="text"
            placeholder="Search entries…"
            value={searchValue}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="top-bar__actions">
        {currentView === 'ledger' && (
          <button
            className={`btn btn--icon ${filtersVisible ? 'btn--icon-active' : ''}`}
            onClick={onToggleFilters}
            title="Toggle Filters"
          >
            <span className="material-icons-outlined">tune</span>
          </button>
        )}

        {/* Export dropdown */}
        <div className="dropdown">
          <button
            className="btn"
            onClick={() => {
              setShowExportMenu(!showExportMenu);
              setShowMoreMenu(false);
            }}
          >
            <span className="material-icons-outlined">ios_share</span>
            Export
          </button>
          {showExportMenu && (
            <div className="dropdown__menu" onMouseLeave={() => setShowExportMenu(false)}>
              <button
                className="dropdown__item"
                onClick={() => { onExport('xlsx'); setShowExportMenu(false); }}
              >
                <span className="material-icons-outlined">table_chart</span>
                Export as Excel
              </button>
              <button
                className="dropdown__item"
                onClick={() => { onExport('csv'); setShowExportMenu(false); }}
              >
                <span className="material-icons-outlined">description</span>
                Export as CSV
              </button>
              <button
                className="dropdown__item"
                onClick={() => { onExport('pdf'); setShowExportMenu(false); }}
              >
                <span className="material-icons-outlined">picture_as_pdf</span>
                Export as PDF
              </button>
            </div>
          )}
        </div>

        {/* More menu */}
        <div className="dropdown">
          <button
            className="btn btn--icon"
            onClick={() => {
              setShowMoreMenu(!showMoreMenu);
              setShowExportMenu(false);
            }}
          >
            <span className="material-icons-outlined">more_horiz</span>
          </button>
          {showMoreMenu && (
            <div className="dropdown__menu" onMouseLeave={() => setShowMoreMenu(false)}>
              <button className="dropdown__item" onClick={() => { onBackup(); setShowMoreMenu(false); }}>
                <span className="material-icons-outlined">backup</span>
                Backup Database
              </button>
              <button className="dropdown__item" onClick={() => { onRestore(); setShowMoreMenu(false); }}>
                <span className="material-icons-outlined">restore</span>
                Restore Database
              </button>
              <div className="dropdown__separator" />
              <button className="dropdown__item" onClick={() => { onToggleTheme(); setShowMoreMenu(false); }}>
                <span className="material-icons-outlined">
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
                {theme === 'dark' ? 'Light Appearance' : 'Dark Appearance'}
              </button>
              <button className="dropdown__item" onClick={() => { onShowShortcuts(); setShowMoreMenu(false); }}>
                <span className="material-icons-outlined">keyboard</span>
                Keyboard Shortcuts
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useCallback, useMemo } from 'react';
import type { LedgerFilters, TransactionType } from '../shared/types';

interface FilterBarProps {
  visible: boolean;
  filters: LedgerFilters;
  types: TransactionType[];
  onChange: (filters: LedgerFilters) => void;
}

// Helper to get date strings in YYYY-MM-DD format
function getDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA'); // returns YYYY-MM-DD
}

function getToday(): string {
  return getDateStr(new Date());
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getDateStr(d);
}

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return getDateStr(d);
}

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | null;

export function FilterBar({ visible, filters, types, onChange }: FilterBarProps) {
  const activePreset = useMemo((): DatePreset => {
    const today = getToday();
    const yesterday = getYesterday();
    const weekStart = getWeekStart();
    const monthStart = getMonthStart();

    if (filters.dateFrom === today && filters.dateTo === today) return 'today';
    if (filters.dateFrom === yesterday && filters.dateTo === yesterday) return 'yesterday';
    if (filters.dateFrom === weekStart && filters.dateTo === today) return 'week';
    if (filters.dateFrom === monthStart && filters.dateTo === today) return 'month';
    return null;
  }, [filters.dateFrom, filters.dateTo]);

  const setDatePreset = useCallback(
    (preset: DatePreset) => {
      if (preset === activePreset) {
        // Toggle off
        onChange({ ...filters, dateFrom: undefined, dateTo: undefined });
        return;
      }

      const today = getToday();
      switch (preset) {
        case 'today':
          onChange({ ...filters, dateFrom: today, dateTo: today });
          break;
        case 'yesterday': {
          const y = getYesterday();
          onChange({ ...filters, dateFrom: y, dateTo: y });
          break;
        }
        case 'week':
          onChange({ ...filters, dateFrom: getWeekStart(), dateTo: today });
          break;
        case 'month':
          onChange({ ...filters, dateFrom: getMonthStart(), dateTo: today });
          break;
      }
    },
    [filters, activePreset, onChange]
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (value === '') {
        onChange({ ...filters, type: undefined });
      } else {
        onChange({ ...filters, type: [value] });
      }
    },
    [filters, onChange]
  );

  const handleInputChange = useCallback(
    (field: keyof LedgerFilters) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onChange({ ...filters, [field]: value || undefined });
    },
    [filters, onChange]
  );

  const handleAmountChange = useCallback(
    (field: 'amountMin' | 'amountMax') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onChange({ ...filters, [field]: value ? parseFloat(value) : undefined });
    },
    [filters, onChange]
  );

  const clearAll = useCallback(() => {
    onChange({});
  }, [onChange]);

  const hasAnyFilter = Object.values(filters).some((v) =>
    v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  );

  return (
    <div className={`filter-bar ${!visible ? 'filter-bar--collapsed' : ''}`}>
      {/* Date presets */}
      <button
        className={`filter-chip ${activePreset === 'today' ? 'filter-chip--active' : ''}`}
        onClick={() => setDatePreset('today')}
      >
        Today
      </button>
      <button
        className={`filter-chip ${activePreset === 'yesterday' ? 'filter-chip--active' : ''}`}
        onClick={() => setDatePreset('yesterday')}
      >
        Yesterday
      </button>
      <button
        className={`filter-chip ${activePreset === 'week' ? 'filter-chip--active' : ''}`}
        onClick={() => setDatePreset('week')}
      >
        This Week
      </button>
      <button
        className={`filter-chip ${activePreset === 'month' ? 'filter-chip--active' : ''}`}
        onClick={() => setDatePreset('month')}
      >
        This Month
      </button>

      {/* Date range inputs */}
      <div className="filter-separator" />
      <input
        type="date"
        className="filter-input"
        value={filters.dateFrom || ''}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
        title="From date"
      />
      <span className="filter-bar__sep-label">to</span>
      <input
        type="date"
        className="filter-input"
        value={filters.dateTo || ''}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
        title="To date"
      />

      <div className="filter-separator" />

      {/* Type dropdown */}
      <select
        className="filter-select"
        value={filters.type?.[0] || ''}
        onChange={handleTypeChange}
      >
        <option value="">All Types</option>
        {types.map((t) => (
          <option key={t.id} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>

      <div className="filter-separator" />

      {/* Text filters */}
      <input
        className="filter-input"
        placeholder="Name..."
        value={filters.name || ''}
        onChange={handleInputChange('name')}
      />
      <input
        className="filter-input"
        placeholder="Driver..."
        value={filters.driver || ''}
        onChange={handleInputChange('driver')}
      />
      <input
        className="filter-input"
        placeholder="Phone..."
        value={filters.phone || ''}
        onChange={handleInputChange('phone')}
      />

      <div className="filter-separator" />

      {/* Amount range */}
      <input
        className="filter-input filter-input--amount"
        type="number"
        placeholder="Min ₹"
        value={filters.amountMin ?? ''}
        onChange={handleAmountChange('amountMin')}
      />
      <input
        className="filter-input filter-input--amount"
        type="number"
        placeholder="Max ₹"
        value={filters.amountMax ?? ''}
        onChange={handleAmountChange('amountMax')}
      />

      {/* Clear all */}
      {hasAnyFilter && (
        <>
          <div className="filter-separator" />
          <button className="filter-chip" onClick={clearAll}>
            <span className="material-icons-outlined filter-chip__icon">close</span>
            Clear
          </button>
        </>
      )}
    </div>
  );
}

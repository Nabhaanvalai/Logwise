import React, { useMemo } from 'react';
import type { DashboardStats, LedgerEntry, LedgerFilters, DailyTotal } from '../shared/types';
import { formatCurrency, formatDateDisplay } from '../shared/format';

interface DashboardProps {
  stats: DashboardStats;
  dailyTotals: DailyTotal[];
  recentEntries: LedgerEntry[];
  onClose: () => void;
  onDrillDown: (filters: LedgerFilters) => void;
  today: string;
}

interface MetricCard {
  key: string;
  icon: string;
  tint: string;
  label: string;
  value: string;
  accent?: string;
  filters?: LedgerFilters;
}

// Short weekday label (Mon, Tue, …) from a YYYY-MM-DD string, locale-independent
// of timezone shifts by parsing the parts directly.
function weekdayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(undefined, { weekday: 'short' });
}

export function Dashboard({
  stats,
  dailyTotals,
  recentEntries,
  onClose,
  onDrillDown,
  today,
}: DashboardProps) {
  const monthStart = today.substring(0, 7) + '-01';

  const cards: MetricCard[] = [
    {
      key: 'today-entries',
      icon: 'edit_note',
      tint: 'blue',
      label: "Today's Entries",
      value: stats.todayEntries.toLocaleString(),
      filters: { dateFrom: today, dateTo: today },
    },
    {
      key: 'today-amount',
      icon: 'payments',
      tint: 'green',
      label: "Today's Amount",
      value: formatCurrency(stats.todayAmount),
      accent: 'green',
      filters: { dateFrom: today, dateTo: today },
    },
    {
      key: 'month-amount',
      icon: 'calendar_month',
      tint: 'orange',
      label: 'This Month',
      value: formatCurrency(stats.monthlyAmount),
      accent: 'orange',
      filters: { dateFrom: monthStart, dateTo: today },
    },
    {
      key: 'total-records',
      icon: 'inventory_2',
      tint: 'indigo',
      label: 'Total Records',
      value: stats.totalEntries.toLocaleString(),
      filters: {},
    },
  ];

  // Normalise bar heights against the busiest day in the window.
  const maxTotal = useMemo(
    () => Math.max(1, ...dailyTotals.map((d) => d.total)),
    [dailyTotals],
  );

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__subtitle">Overview of your ledger activity</p>
        </div>
        <button className="btn" onClick={onClose}>
          <span className="material-icons-outlined">grid_view</span>
          View Ledger
        </button>
      </div>

      {/* Hero — all-time total */}
      <button
        className="dashboard__hero"
        onClick={() => onDrillDown({})}
        title="View all entries"
      >
        <div className="dashboard__hero-icon">
          <span className="material-icons-outlined">account_balance_wallet</span>
        </div>
        <div className="dashboard__hero-content">
          <span className="dashboard__hero-label">All-Time Total</span>
          <span className="dashboard__hero-value">{formatCurrency(stats.totalAmount)}</span>
        </div>
        <span className="dashboard__hero-arrow material-icons-outlined">chevron_right</span>
      </button>

      {/* Metric cards */}
      <div className="dashboard__cards">
        {cards.map((card) => (
          <button
            key={card.key}
            className="dashboard__card"
            onClick={() => card.filters && onDrillDown(card.filters)}
          >
            <div className={`dashboard__card-icon dashboard__card-icon--${card.tint}`}>
              <span className="material-icons-outlined">{card.icon}</span>
            </div>
            <div className="dashboard__card-content">
              <span className="dashboard__card-label">{card.label}</span>
              <span
                className={`dashboard__card-value ${card.accent ? `dashboard__card-value--${card.accent}` : ''}`}
              >
                {card.value}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 7-day trend */}
      <div className="dashboard__panel">
        <h2 className="dashboard__section-title">Last 7 Days</h2>
        {dailyTotals.length === 0 ? (
          <div className="dashboard__empty">
            <span className="material-icons-outlined dashboard__empty-icon">bar_chart</span>
            <p>No activity in the last 7 days.</p>
          </div>
        ) : (
          <div className="dashboard__chart">
            {dailyTotals.map((d) => (
              <div className="dashboard__bar-col" key={d.date} title={`${formatDateDisplay(d.date)} · ${formatCurrency(d.total)}`}>
                <span className="dashboard__bar-amount">{formatCurrency(d.total)}</span>
                <div className="dashboard__bar-track">
                  <div
                    className="dashboard__bar-fill"
                    style={{ ['--bar-height' as string]: `${(d.total / maxTotal) * 100}%` }}
                  />
                </div>
                <span className="dashboard__bar-label">{weekdayLabel(d.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent entries */}
      <div className="dashboard__panel">
        <h2 className="dashboard__section-title">Recent Entries</h2>
        {recentEntries.length === 0 ? (
          <div className="dashboard__empty">
            <span className="material-icons-outlined dashboard__empty-icon">note_add</span>
            <p>No entries yet. Start adding records in the ledger.</p>
          </div>
        ) : (
          <div className="dash-table">
            <div className="dash-table__row dash-table__row--head">
              <span>Bill No</span>
              <span>Date</span>
              <span>Name</span>
              <span>Type</span>
              <span className="dash-table__num">Amount</span>
            </div>
            {recentEntries.map((entry) => (
              <div className="dash-table__row" key={entry.id}>
                <span className="tabular-nums">{entry.bill_no || '—'}</span>
                <span className="tabular-nums">{formatDateDisplay(entry.date)}</span>
                <span className="truncate">{entry.name || '—'}</span>
                <span>
                  {entry.type && (
                    <span className={`type-badge type-badge--${entry.type.toLowerCase().replace(/\s+/g, '')}`}>
                      {entry.type}
                    </span>
                  )}
                </span>
                <span className="dash-table__num tabular-nums">
                  {entry.amount != null ? formatCurrency(entry.amount) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

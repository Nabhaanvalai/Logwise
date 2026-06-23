import React from 'react';
import { formatCurrency } from '../shared/format';

interface StatusBarProps {
  visibleCount: number;
  visibleAmount: number;
  filteredTotal: number;
  totalEntries: number;
  totalAmount: number;
  todayEntries: number;
  todayAmount: number;
  page: number;
  pageSize: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function StatusBar({
  visibleCount,
  visibleAmount,
  filteredTotal,
  totalEntries,
  totalAmount,
  todayEntries,
  todayAmount,
  page,
  pageSize,
  onPrevPage,
  onNextPage,
}: StatusBarProps) {
  const firstRow = filteredTotal === 0 ? 0 : page * pageSize + 1;
  const lastRow = page * pageSize + visibleCount;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const hasPrev = page > 0;
  const hasNext = lastRow < filteredTotal;

  return (
    <div className="status-bar">
      <div className="status-bar__group">
        <div className="status-bar__item">
          <span className="status-bar__label">Showing</span>
          <span className="status-bar__value">{firstRow}–{lastRow}</span>
          <span className="status-bar__label">of {filteredTotal.toLocaleString()}</span>
        </div>
        <div className="status-bar__item">
          <span className="status-bar__label">Page Total</span>
          <span className="status-bar__value status-bar__value--accent">
            {formatCurrency(visibleAmount)}
          </span>
        </div>
        {totalPages > 1 && (
          <div className="status-bar__pager">
            <button
              className="status-bar__pager-btn"
              onClick={onPrevPage}
              disabled={!hasPrev}
              title="Previous page"
            >
              <span className="material-icons-outlined">chevron_left</span>
            </button>
            <span className="status-bar__label">Page {page + 1} of {totalPages}</span>
            <button
              className="status-bar__pager-btn"
              onClick={onNextPage}
              disabled={!hasNext}
              title="Next page"
            >
              <span className="material-icons-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </div>
      <div className="status-bar__group">
        <div className="status-bar__item">
          <span className="status-bar__label">Today</span>
          <span className="status-bar__value">{todayEntries} entries</span>
          <span className="status-bar__value status-bar__value--success">
            {formatCurrency(todayAmount)}
          </span>
        </div>
        <div className="status-bar__item">
          <span className="status-bar__label">All-time</span>
          <span className="status-bar__value">{totalEntries.toLocaleString()} · {formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}

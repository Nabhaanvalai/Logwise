import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LedgerGrid } from './components/LedgerGrid';
import { FilterBar } from './components/FilterBar';
import { TopBar } from './components/TopBar';
import { StatusBar } from './components/StatusBar';
import { Dashboard } from './components/Dashboard';
import { Toast } from './components/Toast';
import { ShortcutsHelp } from './components/ShortcutsHelp';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { todayISO } from './shared/format';
import type { LedgerEntry, LedgerFilters, DashboardStats, TransactionType, DailyTotal } from './shared/types';

// Rows fetched per page. Keeps memory/IPC bounded even with 100k+ records.
const PAGE_SIZE = 100;

export default function App() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [filters, setFilters] = useState<LedgerFilters>({});
  const [stats, setStats] = useState<DashboardStats>({
    totalEntries: 0,
    totalAmount: 0,
    todayEntries: 0,
    todayAmount: 0,
    monthlyAmount: 0,
  });
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([]);
  const [theme, setTheme] = useState<string>('dark');
  const [showFilters, setShowFilters] = useState(true);
  const [view, setView] = useState<'ledger' | 'dashboard'>('dashboard');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
    action?: { label: string; onClick: () => void };
  } | null>(null);
  const [distinctNames, setDistinctNames] = useState<string[]>([]);
  const [distinctDrivers, setDistinctDrivers] = useState<string[]>([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' = 'success',
      action?: { label: string; onClick: () => void },
    ) => {
      // Wrap the action so clicking it also dismisses the toast.
      const wrapped = action
        ? { label: action.label, onClick: () => { setToast(null); action.onClick(); } }
        : undefined;
      setToast({ message, type, action: wrapped });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      // Give actionable toasts (e.g. Undo) more time to be clicked.
      toastTimeout.current = setTimeout(() => setToast(null), action ? 6000 : 3000);
    },
    [],
  );

  const loadEntries = useCallback(async () => {
    try {
      const { rows, total } = await window.api.getEntries(filters, PAGE_SIZE, page * PAGE_SIZE);
      setEntries(rows);
      setFilteredTotal(total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load entries', 'error');
    }
  }, [filters, page, showToast]);

  const loadStats = useCallback(async () => {
    try {
      const [s, daily] = await Promise.all([
        window.api.getStats(),
        window.api.getDailyTotals(7),
      ]);
      setStats(s);
      setDailyTotals(daily);
    } catch {
      /* stats are non-critical; ignore transient failures */
    }
  }, []);

  const loadTypes = useCallback(async () => {
    try {
      setTypes(await window.api.getTypes());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load types', 'error');
    }
  }, [showToast]);

  const loadAutoComplete = useCallback(async () => {
    try {
      const [names, drivers] = await Promise.all([
        window.api.getDistinctNames(),
        window.api.getDistinctDrivers(),
      ]);
      setDistinctNames(names);
      setDistinctDrivers(drivers);
    } catch {
      /* autocomplete is non-critical */
    }
  }, []);

  const loadTheme = useCallback(async () => {
    try {
      const saved = await window.api.getTheme();
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } catch {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTheme();
    loadTypes();
    loadAutoComplete();
  }, []);

  // Debounce the DB query so rapid filter/search typing coalesces into a single
  // round-trip. Filter state still updates instantly, so inputs stay responsive.
  const debouncedLoadEntries = useDebouncedCallback(() => loadEntries(), 250);
  useEffect(() => {
    debouncedLoadEntries();
  }, [filters, page, debouncedLoadEntries]);

  // Stats load once on mount and are refreshed after every mutation
  // (see handleEntryChange) — no wasteful polling timer.
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    await window.api.setTheme(newTheme);
  }, [theme]);

  const handleSearch = useCallback((search: string) => {
    setPage(0);
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  const handleFilterChange = useCallback((newFilters: LedgerFilters) => {
    setPage(0);
    setFilters(newFilters);
  }, []);

  // Jump from a dashboard card into the ledger, pre-filtered.
  const handleDrillDown = useCallback((newFilters: LedgerFilters) => {
    setPage(0);
    setFilters(newFilters);
    setView('ledger');
  }, []);

  const handleEntryChange = useCallback(async () => {
    await loadEntries();
    await loadStats();
    await loadAutoComplete();
  }, [loadEntries, loadStats, loadAutoComplete]);

  const handleExport = useCallback(async (format: 'xlsx' | 'csv' | 'pdf') => {
    try {
      const data = await window.api.exportData(filters);
      if (data.length === 0) {
        showToast('No data to export', 'error');
        return;
      }

      // Dynamic import to keep initial bundle smaller
      if (format === 'xlsx' || format === 'csv') {
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(
          data.map((e) => ({
            'Bill No': e.bill_no,
            'Date': e.date,
            'Name': e.name,
            'Type': e.type,
            'Phone': e.phone,
            'Hours': e.hours,
            'Driver': e.driver_name,
            'Amount': e.amount,
            'Notes': e.notes,
          }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
        const buf = XLSX.write(wb, { type: 'array', bookType: format === 'xlsx' ? 'xlsx' : 'csv' });
        const a = document.createElement('a');
        const url = URL.createObjectURL(new Blob([buf], {
          type: format === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv',
        }));
        a.href = url;
        a.download = `logwise_export_${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported ${data.length} records as ${format.toUpperCase()}`);
      } else if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(18);
        doc.text('LogWise Ledger Export', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

        autoTable(doc, {
          startY: 36,
          head: [['Bill No', 'Date', 'Name', 'Type', 'Phone', 'Hours', 'Driver', 'Amount', 'Notes']],
          body: data.map((e) => [
            e.bill_no, e.date, e.name, e.type, e.phone,
            e.hours ?? '', e.driver_name, e.amount ?? 0, e.notes,
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [10, 132, 255] },
        });

        doc.save(`logwise_export_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast(`Exported ${data.length} records as PDF`);
      }
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed', 'error');
    }
  }, [filters, showToast]);

  const handleBackup = useCallback(async () => {
    try {
      const path = await window.api.backup();
      if (path) {
        showToast(`Backup saved to ${path}`);
      }
    } catch (err) {
      showToast('Backup failed', 'error');
    }
  }, [showToast]);

  const handleRestore = useCallback(async () => {
    try {
      const success = await window.api.restore();
      if (success) {
        showToast('Database restored successfully');
        await loadEntries();
        await loadStats();
        await loadTypes();
        await loadAutoComplete();
      }
    } catch (err) {
      showToast('Restore failed', 'error');
    }
  }, [showToast, loadEntries, loadStats, loadTypes, loadAutoComplete]);

  // App-level shortcuts: Ctrl+E to export, '?' to toggle the help overlay.
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      const tag = node?.tagName;
      return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || node?.isContentEditable === true;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        handleExport('xlsx');
      } else if (e.key === '?' && !isTyping(e.target)) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleExport]);

  // Visible stats (computed from current entries array)
  const visibleAmount = entries.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Recent entries for dashboard (last 10)
  const recentEntries = useMemo(() => {
    return [...entries].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 10);
  }, [entries]);

  return (
    <div className="app-layout">
      <TopBar
        onSearch={handleSearch}
        onExport={handleExport}
        onBackup={handleBackup}
        onRestore={handleRestore}
        onToggleTheme={toggleTheme}
        onToggleFilters={() => setShowFilters((v) => !v)}
        onToggleView={() => setView((v) => v === 'ledger' ? 'dashboard' : 'ledger')}
        onShowShortcuts={() => setShowShortcuts(true)}
        theme={theme}
        filtersVisible={showFilters}
        currentView={view}
      />

      {view === 'dashboard' ? (
        <div className="dashboard-scroll-area">
          <Dashboard
            stats={stats}
            dailyTotals={dailyTotals}
            recentEntries={recentEntries}
            onClose={() => setView('ledger')}
            onDrillDown={handleDrillDown}
            today={todayISO()}
          />
        </div>
      ) : (
        <>
          <FilterBar
            visible={showFilters}
            filters={filters}
            types={types}
            onChange={handleFilterChange}
          />
          <LedgerGrid
            entries={entries}
            types={types}
            distinctNames={distinctNames}
            distinctDrivers={distinctDrivers}
            onChange={handleEntryChange}
            showToast={showToast}
          />
          <StatusBar
            visibleCount={entries.length}
            visibleAmount={visibleAmount}
            filteredTotal={filteredTotal}
            totalEntries={stats.totalEntries}
            totalAmount={stats.totalAmount}
            todayEntries={stats.todayEntries}
            todayAmount={stats.todayAmount}
            page={page}
            pageSize={PAGE_SIZE}
            onPrevPage={() => setPage((p) => Math.max(0, p - 1))}
            onNextPage={() => setPage((p) => (p + 1) * PAGE_SIZE < filteredTotal ? p + 1 : p)}
          />
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} action={toast.action} />}
      {showShortcuts && <ShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

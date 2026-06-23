// Shared types between main and renderer processes

export interface LedgerEntry {
  id?: number;
  bill_no: string;
  date: string;
  name: string;
  type: string;
  phone: string;
  hours: number | null;
  driver_name: string;
  amount: number | null;
  notes: string;
  created_at?: string;
}

export interface LedgerFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string[];
  name?: string;
  driver?: string;
  phone?: string;
  billNo?: string;
  amountMin?: number;
  amountMax?: number;
}

export interface DashboardStats {
  totalEntries: number;
  totalAmount: number;
  todayEntries: number;
  todayAmount: number;
  monthlyAmount: number;
}

export interface TransactionType {
  id: number;
  name: string;
}

/** A page of ledger rows plus the total row count for the active filter. */
export interface PagedEntries {
  rows: LedgerEntry[];
  total: number;
}

/** Aggregated per-day totals used by the dashboard trend chart. */
export interface DailyTotal {
  date: string;
  count: number;
  total: number;
}

// The API exposed to the renderer process via contextBridge.
// Each method unwraps the main process's Result: it resolves with the data on
// success and rejects (throws) with the error message on failure.
export interface LogWiseAPI {
  getEntries: (filters?: LedgerFilters, limit?: number, offset?: number) => Promise<PagedEntries>;
  insertEntry: (entry: Omit<LedgerEntry, 'id' | 'created_at'>) => Promise<LedgerEntry>;
  updateEntry: (entry: LedgerEntry) => Promise<LedgerEntry>;
  deleteEntry: (id: number) => Promise<void>;
  getTypes: () => Promise<TransactionType[]>;
  addType: (name: string) => Promise<TransactionType>;
  getStats: () => Promise<DashboardStats>;
  getDailyTotals: (days?: number) => Promise<DailyTotal[]>;
  getNextBillNo: () => Promise<string>;
  getDistinctNames: () => Promise<string[]>;
  getDistinctDrivers: () => Promise<string[]>;
  exportData: (filters?: LedgerFilters) => Promise<LedgerEntry[]>;
  backup: () => Promise<string>;
  restore: () => Promise<boolean>;
  getTheme: () => Promise<string>;
  setTheme: (theme: string) => Promise<void>;
}

declare global {
  interface Window {
    api: LogWiseAPI;
  }
}

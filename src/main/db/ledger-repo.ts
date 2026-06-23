import type {
  LedgerEntry,
  LedgerFilters,
  DashboardStats,
  TransactionType,
  PagedEntries,
  DailyTotal,
} from '../../shared/types';
import { validateEntry } from '../../shared/validation';
import { getDb } from './connection';

/**
 * Build the shared WHERE clause (and its bound params) used by both the paged
 * SELECT and the COUNT query, so they stay perfectly in sync.
 */
function buildWhere(filters?: LedgerFilters): { clause: string; params: any[] } {
  let clause = ' WHERE 1=1';
  const params: any[] = [];
  if (!filters) return { clause, params };

  if (filters.search) {
    clause += ` AND (
      bill_no LIKE ? OR name LIKE ? OR type LIKE ? OR
      phone LIKE ? OR driver_name LIKE ? OR notes LIKE ?
    )`;
    const term = `%${filters.search}%`;
    params.push(term, term, term, term, term, term);
  }
  if (filters.dateFrom) { clause += ' AND date >= ?'; params.push(filters.dateFrom); }
  if (filters.dateTo) { clause += ' AND date <= ?'; params.push(filters.dateTo); }
  if (filters.type && filters.type.length > 0) {
    clause += ` AND type IN (${filters.type.map(() => '?').join(',')})`;
    params.push(...filters.type);
  }
  if (filters.name) { clause += ' AND name LIKE ?'; params.push(`%${filters.name}%`); }
  if (filters.driver) { clause += ' AND driver_name LIKE ?'; params.push(`%${filters.driver}%`); }
  if (filters.phone) { clause += ' AND phone LIKE ?'; params.push(`%${filters.phone}%`); }
  if (filters.billNo) { clause += ' AND bill_no LIKE ?'; params.push(`%${filters.billNo}%`); }
  if (filters.amountMin !== undefined && filters.amountMin !== null) {
    clause += ' AND amount >= ?'; params.push(filters.amountMin);
  }
  if (filters.amountMax !== undefined && filters.amountMax !== null) {
    clause += ' AND amount <= ?'; params.push(filters.amountMax);
  }
  return { clause, params };
}

/**
 * Returns a page of rows plus the total count for the same filter, so the UI
 * can paginate without ever loading 100k rows at once.
 */
export function getEntries(filters?: LedgerFilters, limit = 200, offset = 0): PagedEntries {
  const db = getDb();
  const { clause, params } = buildWhere(filters);

  const total = (db.prepare(`SELECT COUNT(*) AS c FROM ledger${clause}`).get(...params) as any).c as number;
  const rows = db
    .prepare(`SELECT * FROM ledger${clause} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as LedgerEntry[];

  return { rows, total };
}

export function insertEntry(entry: Omit<LedgerEntry, 'id' | 'created_at'>): LedgerEntry {
  const check = validateEntry(entry);
  if (!check.ok) throw new Error(check.error);

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO ledger (bill_no, date, name, type, phone, hours, driver_name, amount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.bill_no, entry.date, entry.name, entry.type, entry.phone,
    entry.hours, entry.driver_name, entry.amount, entry.notes,
  );
  return db.prepare('SELECT * FROM ledger WHERE id = ?').get(result.lastInsertRowid) as LedgerEntry;
}

export function updateEntry(entry: LedgerEntry): LedgerEntry {
  const check = validateEntry(entry);
  if (!check.ok) throw new Error(check.error);

  const db = getDb();
  db.prepare(`
    UPDATE ledger SET
      bill_no = ?, date = ?, name = ?, type = ?, phone = ?,
      hours = ?, driver_name = ?, amount = ?, notes = ?
    WHERE id = ?
  `).run(
    entry.bill_no, entry.date, entry.name, entry.type, entry.phone,
    entry.hours, entry.driver_name, entry.amount, entry.notes, entry.id,
  );
  return db.prepare('SELECT * FROM ledger WHERE id = ?').get(entry.id) as LedgerEntry;
}

export function deleteEntry(id: number): void {
  getDb().prepare('DELETE FROM ledger WHERE id = ?').run(id);
}

export function getTypes(): TransactionType[] {
  return getDb().prepare('SELECT * FROM transaction_types ORDER BY name').all() as TransactionType[];
}

export function addType(name: string): TransactionType {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO transaction_types (name) VALUES (?)').run(name);
  return db.prepare('SELECT * FROM transaction_types WHERE name = ?').get(name) as TransactionType;
}

export function getStats(): DashboardStats {
  const db = getDb();
  const today = new Date().toLocaleDateString('en-CA');
  const monthStart = today.substring(0, 7) + '-01';

  const totalEntries = (db.prepare('SELECT COUNT(*) as count FROM ledger').get() as any).count;
  const totalAmount = (db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM ledger').get() as any).total;
  const todayEntries = (db.prepare('SELECT COUNT(*) as count FROM ledger WHERE date = ?').get(today) as any).count;
  const todayAmount = (db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM ledger WHERE date = ?').get(today) as any).total;
  const monthlyAmount = (db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM ledger WHERE date >= ?').get(monthStart) as any).total;

  return { totalEntries, totalAmount, todayEntries, todayAmount, monthlyAmount };
}

/** Per-day entry counts + totals for the last `days` days (for the dashboard chart). */
export function getDailyTotals(days = 7): DailyTotal[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT date, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
    FROM ledger
    GROUP BY date
    ORDER BY date DESC
    LIMIT ?
  `).all(days) as DailyTotal[];
  return rows.reverse(); // chronological order for charting
}

export function getNextBillNo(): string {
  const last = getDb().prepare(
    "SELECT bill_no FROM ledger WHERE bill_no LIKE 'B%' ORDER BY CAST(SUBSTR(bill_no, 2) AS INTEGER) DESC LIMIT 1"
  ).get() as { bill_no: string } | undefined;

  if (!last || !last.bill_no) return 'B001';
  const num = parseInt(last.bill_no.substring(1), 10);
  if (isNaN(num)) return 'B001';
  return `B${String(num + 1).padStart(3, '0')}`;
}

export function getDistinctNames(): string[] {
  const rows = getDb().prepare("SELECT DISTINCT name FROM ledger WHERE name != '' ORDER BY name").all() as { name: string }[];
  return rows.map((r) => r.name);
}

export function getDistinctDrivers(): string[] {
  const rows = getDb().prepare("SELECT DISTINCT driver_name FROM ledger WHERE driver_name != '' ORDER BY driver_name").all() as { driver_name: string }[];
  return rows.map((r) => r.driver_name);
}

export function getTheme(): string {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = 'theme'").get() as { value: string } | undefined;
  return row?.value || 'dark';
}

export function setTheme(theme: string): void {
  getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)").run(theme);
}

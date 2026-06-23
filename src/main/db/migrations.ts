import type Database from 'better-sqlite3';

const DEFAULT_TYPES = [
  'JCB', 'Bricks', 'Sand', 'Labour', 'Concrete',
  'Diesel', 'Transport', 'Rental', 'Other',
];

/**
 * Ordered list of migrations. Each entry's index+1 is its schema version. We
 * track the applied version in SQLite's built-in `user_version` pragma, so new
 * migrations run exactly once — even on databases created by older builds.
 */
const MIGRATIONS: Array<(db: Database.Database) => void> = [
  // v1 — initial schema (matches the original CREATE TABLE statements).
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_no TEXT DEFAULT '',
        date TEXT NOT NULL,
        name TEXT DEFAULT '',
        type TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        hours REAL,
        driver_name TEXT DEFAULT '',
        amount REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime'))
      );

      CREATE TABLE IF NOT EXISTS transaction_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const insertType = db.prepare('INSERT OR IGNORE INTO transaction_types (name) VALUES (?)');
    for (const type of DEFAULT_TYPES) insertType.run(type);

    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('theme', 'dark');
  },

  // v2 — indexes for fast filtering/sorting at 100k+ rows, plus a unique
  // constraint on non-empty bill numbers to prevent duplicates.
  (db) => {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ledger_date    ON ledger(date);
      CREATE INDEX IF NOT EXISTS idx_ledger_type    ON ledger(type);
      CREATE INDEX IF NOT EXISTS idx_ledger_name    ON ledger(name);
      CREATE INDEX IF NOT EXISTS idx_ledger_driver  ON ledger(driver_name);
      CREATE INDEX IF NOT EXISTS idx_ledger_phone   ON ledger(phone);
      CREATE INDEX IF NOT EXISTS idx_ledger_amount  ON ledger(amount);
      CREATE INDEX IF NOT EXISTS idx_ledger_id_desc ON ledger(id DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_bill_no
        ON ledger(bill_no) WHERE bill_no <> '';
    `);
  },
];

export function runMigrations(db: Database.Database): void {
  const current = db.pragma('user_version', { simple: true }) as number;

  const apply = db.transaction((from: number) => {
    for (let v = from; v < MIGRATIONS.length; v++) {
      MIGRATIONS[v](db);
    }
    // pragma can't be parameterised; value is a trusted integer.
    db.pragma(`user_version = ${MIGRATIONS.length}`);
  });

  if (current < MIGRATIONS.length) apply(current);
}

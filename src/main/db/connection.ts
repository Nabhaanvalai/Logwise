import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';
import { runMigrations } from './migrations';

let db: Database.Database | null = null;

export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), 'logwise.db');
}

/** Open (or reopen) the database, apply pragmas and run pending migrations. */
export function initDatabase(): Database.Database {
  db = new Database(getDatabasePath());

  // WAL gives better concurrent read/write performance for a desktop app.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  return db;
}

/** Accessor used by the repository layer. Throws if the DB isn't open yet. */
export function getDb(): Database.Database {
  if (!db) throw new Error('Database has not been initialised.');
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Barrel re-export. The database layer was split into focused modules under
// ./db (connection, migrations, repository). This file preserves the original
// import path used by main.ts and the IPC handlers.

export { initDatabase, closeDatabase, getDatabasePath, getDb } from './db/connection';
export * from './db/ledger-repo';

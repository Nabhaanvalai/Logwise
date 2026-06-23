import { ipcMain, dialog } from 'electron';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import * as db from './database';
import { IPC } from '../shared/ipc';
import { type Result, tryResult, tryResultAsync } from '../shared/result';

// Effectively "no limit" for full-ledger exports.
const EXPORT_LIMIT = 1_000_000;

/** Verify a file is a healthy LogWise database before we trust it for restore. */
function isValidLogWiseDb(filePath: string): boolean {
  let probe: Database.Database | null = null;
  try {
    probe = new Database(filePath, { readonly: true, fileMustExist: true });
    const integrity = probe.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') return false;
    const table = probe
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ledger'")
      .get();
    return Boolean(table);
  } catch {
    return false;
  } finally {
    probe?.close();
  }
}

export function registerIpcHandlers(): void {
  // --- Reads -------------------------------------------------------------
  ipcMain.handle(IPC.getEntries, (_e, filters, limit, offset): Result<unknown> =>
    tryResult(() => db.getEntries(filters, limit, offset)));

  ipcMain.handle(IPC.getTypes, (): Result<unknown> => tryResult(() => db.getTypes()));
  ipcMain.handle(IPC.getStats, (): Result<unknown> => tryResult(() => db.getStats()));
  ipcMain.handle(IPC.getDailyTotals, (_e, days): Result<unknown> => tryResult(() => db.getDailyTotals(days)));
  ipcMain.handle(IPC.getNextBillNo, (): Result<unknown> => tryResult(() => db.getNextBillNo()));
  ipcMain.handle(IPC.getDistinctNames, (): Result<unknown> => tryResult(() => db.getDistinctNames()));
  ipcMain.handle(IPC.getDistinctDrivers, (): Result<unknown> => tryResult(() => db.getDistinctDrivers()));
  ipcMain.handle(IPC.getTheme, (): Result<unknown> => tryResult(() => db.getTheme()));

  // exportData returns the full filtered set (no paging) for file export.
  ipcMain.handle(IPC.exportData, (_e, filters): Result<unknown> =>
    tryResult(() => db.getEntries(filters, EXPORT_LIMIT, 0).rows));

  // --- Writes ------------------------------------------------------------
  ipcMain.handle(IPC.insertEntry, (_e, entry): Result<unknown> => tryResult(() => db.insertEntry(entry)));
  ipcMain.handle(IPC.updateEntry, (_e, entry): Result<unknown> => tryResult(() => db.updateEntry(entry)));
  ipcMain.handle(IPC.deleteEntry, (_e, id): Result<unknown> => tryResult(() => db.deleteEntry(id)));
  ipcMain.handle(IPC.addType, (_e, name): Result<unknown> => tryResult(() => db.addType(name)));
  ipcMain.handle(IPC.setTheme, (_e, theme): Result<unknown> => tryResult(() => db.setTheme(theme)));

  // --- Backup / Restore --------------------------------------------------
  ipcMain.handle(IPC.backup, (): Promise<Result<string>> =>
    tryResultAsync(async () => {
      const result = await dialog.showSaveDialog({
        title: 'Backup LogWise Database',
        defaultPath: `logwise_backup_${new Date().toISOString().split('T')[0]}.db`,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      });
      if (result.canceled || !result.filePath) return '';
      // better-sqlite3's backup API produces a consistent snapshot even while
      // WAL mode is active (a plain file copy can miss un-checkpointed data).
      await db.getDb().backup(result.filePath);
      return result.filePath;
    }));

  ipcMain.handle(IPC.restore, (): Promise<Result<boolean>> =>
    tryResultAsync(async () => {
      const result = await dialog.showOpenDialog({
        title: 'Restore LogWise Database',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        properties: ['openFile'],
      });
      if (result.canceled || result.filePaths.length === 0) return false;

      const sourcePath = result.filePaths[0];
      if (!isValidLogWiseDb(sourcePath)) {
        throw new Error('Selected file is not a valid LogWise database.');
      }

      const destPath = db.getDatabasePath();
      const backupPath = destPath + '.bak';

      db.closeDatabase();
      if (fs.existsSync(destPath)) fs.copyFileSync(destPath, backupPath);

      try {
        fs.copyFileSync(sourcePath, destPath);
        db.initDatabase();
        return true;
      } catch (error) {
        // Roll back to the pre-restore database on any failure.
        if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, destPath);
        db.initDatabase();
        throw error;
      }
    }));
}

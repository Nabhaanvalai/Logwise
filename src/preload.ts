import { contextBridge, ipcRenderer } from 'electron';
import type { LogWiseAPI } from './shared/types';
import { IPC } from './shared/ipc';
import type { Result } from './shared/result';

/**
 * Invoke a handler and unwrap its Result: resolve with the data on success,
 * reject with an Error on failure. This lets renderer code use plain try/catch.
 */
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as Result<T>;
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

const api: LogWiseAPI = {
  getEntries: (filters, limit, offset) => invoke(IPC.getEntries, filters, limit, offset),
  insertEntry: (entry) => invoke(IPC.insertEntry, entry),
  updateEntry: (entry) => invoke(IPC.updateEntry, entry),
  deleteEntry: (id) => invoke(IPC.deleteEntry, id),
  getTypes: () => invoke(IPC.getTypes),
  addType: (name) => invoke(IPC.addType, name),
  getStats: () => invoke(IPC.getStats),
  getDailyTotals: (days) => invoke(IPC.getDailyTotals, days),
  getNextBillNo: () => invoke(IPC.getNextBillNo),
  getDistinctNames: () => invoke(IPC.getDistinctNames),
  getDistinctDrivers: () => invoke(IPC.getDistinctDrivers),
  exportData: (filters) => invoke(IPC.exportData, filters),
  backup: () => invoke(IPC.backup),
  restore: () => invoke(IPC.restore),
  getTheme: () => invoke(IPC.getTheme),
  setTheme: (theme) => invoke(IPC.setTheme, theme),
};

contextBridge.exposeInMainWorld('api', api);

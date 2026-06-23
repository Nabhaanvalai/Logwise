// Single source of truth for IPC channel names.
// Referenced by both the preload bridge (src/preload.ts) and the main-process
// handlers (src/main/ipc-handlers.ts) so the two can never drift apart.

export const IPC = {
  getEntries: 'db:getEntries',
  insertEntry: 'db:insertEntry',
  updateEntry: 'db:updateEntry',
  deleteEntry: 'db:deleteEntry',
  getTypes: 'db:getTypes',
  addType: 'db:addType',
  getStats: 'db:getStats',
  getDailyTotals: 'db:getDailyTotals',
  getNextBillNo: 'db:getNextBillNo',
  getDistinctNames: 'db:getDistinctNames',
  getDistinctDrivers: 'db:getDistinctDrivers',
  exportData: 'db:exportData',
  backup: 'db:backup',
  restore: 'db:restore',
  getTheme: 'db:getTheme',
  setTheme: 'db:setTheme',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];

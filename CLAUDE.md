# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

LogWise is an offline-first Electron desktop app — a digital ledger to replace handwritten notebooks for contractors, equipment-rental operators, and small businesses. Data entry is spreadsheet-style (no forms), filtering is the primary navigation method, and everything runs locally against a single SQLite file. See `prd.md` for the full product spec, field definitions, and V1 scope (deliberately *not* accounting/GST/inventory/multi-user).

## Commands

```bash
npm start            # Run the app in dev (electron-forge start + Vite dev server with HMR)
npm run lint         # ESLint over .ts/.tsx
npm run package      # Package the app (unpackaged build in out/)
npm run make         # Build distributable installers (Squirrel/zip/deb/rpm)
```

There is **no test framework** configured. There is no standalone typecheck script; type errors surface through the Vite build and the editor (`tsconfig.json` has `strict: false`).

## Architecture

Electron app built with **electron-forge + the Vite plugin**. Three separate build targets are defined in `forge.config.ts`, each with its own Vite config:

- **Main process** (`src/main.ts`, config `vite.main.config.ts`) — app lifecycle, window creation. `better-sqlite3` is marked `external` here and unpacked from the asar (see `forge.config.ts` `asar.unpack` + `AutoUnpackNativesPlugin`) because it's a native module.
- **Preload** (`src/preload.ts`, config `vite.preload.config.ts`) — exposes a typed `window.api` to the renderer via `contextBridge`. `contextIsolation` is on and `nodeIntegration` is off.
- **Renderer** (`index.html` → `src/renderer.tsx`, config `vite.renderer.config.ts`) — React 19 + Tailwind v4 + AG Grid UI.

### The IPC contract is the spine of the app

Renderer code **never** touches the database or Node APIs directly. Every privileged operation flows through one channel:

```
React component → window.api.<method>()        (src/preload.ts)
  → ipcRenderer.invoke(IPC.<method>)             (channel names in src/shared/ipc.ts)
  → ipcMain.handle in src/main/ipc-handlers.ts   (wrapped in tryResult → Result<T>)
  → repository function in src/main/db/ledger-repo.ts
```

Channel names live in **`src/shared/ipc.ts`** (the `IPC` const) — never hardcode `'db:…'` strings. Handlers return a **`Result<T>`** (`src/shared/result.ts`); the preload `invoke()` helper unwraps it, resolving with `data` or **throwing** the error message, so renderer code uses ordinary `try/catch` and surfaces failures via `showToast`.

`src/shared/types.ts` is the single source of truth shared across all three processes; `LogWiseAPI` there defines the entire surface. **Adding a backend capability touches five files in lockstep:** repo function in `db/ledger-repo.ts`, channel in `shared/ipc.ts`, handler in `ipc-handlers.ts`, bridge method in `preload.ts`, and the `LogWiseAPI` signature in `shared/types.ts`.

### Data model

SQLite via `better-sqlite3` (synchronous API), WAL mode. The DB layer is split under **`src/main/db/`**: `connection.ts` (open + pragmas), `migrations.ts`, `ledger-repo.ts` (all queries). `src/main/database.ts` is just a barrel re-export preserving the old import path.

- **Schema changes go through `migrations.ts`** — an ordered array keyed off SQLite's `PRAGMA user_version`. Append a new migration function (never edit old ones); it runs exactly once, even on existing user DBs. Migration 1 = base tables; migration 2 = indexes + a partial `UNIQUE` index on non-empty `bill_no`.
- Tables: `ledger`, `transaction_types` (seeded defaults + user-added), `settings` (key/value).
- **`getEntries` is paginated** — it takes `(filters, limit, offset)` and returns `PagedEntries { rows, total }`. `buildWhere()` produces one WHERE clause shared by the SELECT and COUNT so they can't drift.
- **Writes are validated** by `validateEntry` (`src/shared/validation.ts`) in the repo before hitting SQLite (the renderer runs the same `getEntryErrors` for inline feedback).
- The DB lives at `app.getPath('userData')/logwise.db`. Backup uses better-sqlite3's `.backup()` (WAL-safe); restore validates the picked file (`PRAGMA integrity_check` + `ledger` table present) and keeps a `.bak` rollback.

### Frontend conventions

- **`App.tsx` is the state hub.** It owns all state and passes data + callbacks down; components are presentational. No router/state library; `view` toggles `'dashboard'`/`'ledger'`. Pagination lives here (`page` state + `PAGE_SIZE`), reset to 0 on any filter change.
- **Filtering happens in SQL, not the grid.** Changing the `LedgerFilters` object re-runs `getEntries` in the main process. The DB query is **debounced centrally** via `useDebouncedCallback` (`src/hooks/`) so typing stays responsive — individual inputs are *not* separately debounced. Stats refresh after mutations (`handleEntryChange`), not on a timer.
- **The ledger grid (`LedgerGrid.tsx`) saves on cell-edit-stop.** A *pinned bottom row* (`_isNewRow: true`) is the new-entry affordance. Delete uses the styled `ConfirmDialog` + an Undo toast (re-inserts the row), never native `confirm()`. Dates stored `YYYY-MM-DD`, shown `DD-MM-YYYY`.
- **Shared helpers** live in `src/shared/format.ts` (`formatCurrency`, `formatDateDisplay`, `parseDateForStorage`, `todayISO`) — don't re-implement these per-component.
- **Exports run in the renderer**: `xlsx`/`jspdf` are dynamically `import()`-ed in `App.tsx`'s `handleExport` and downloaded via Blob + anchor.
- **Styling is class-driven** — avoid inline `style={{}}` (the one sanctioned exception is passing a computed value as a CSS custom property, e.g. the dashboard chart's `--bar-height`). Colors come from CSS tokens in `src/index.css`: system colors (`--apple-*`), translucent `--tint-*` (via `color-mix`), and theme-aware tokens; light/dark switches on `<html data-theme>`.
- **Fonts are self-hosted** (`src/assets/fonts/`, `@font-face` in `index.css`) so the offline-first app needs no CDN. Material Icons render via the bundled icon font using `<span class="material-icons-outlined">name</span>` ligatures.

## Security note

`.claude/settings.local.json` contains a live `ANTHROPIC_AUTH_TOKEN` (an OpenRouter key) in plaintext. It is git-ignored (not committed), but treat it as a leaked secret — **rotate the key** and avoid pasting real credentials into tracked or shared files.

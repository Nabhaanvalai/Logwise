import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type CellValueChangedEvent,
  type CellEditingStoppedEvent,
  type GridReadyEvent,
  type GridApi,
  type CellKeyDownEvent,
} from 'ag-grid-community';
import type { LedgerEntry, TransactionType } from '../shared/types';
import { formatCurrency, formatDateDisplay, parseDateForStorage, todayISO } from '../shared/format';
import { getEntryErrors } from '../shared/validation';
import { ConfirmDialog } from './ConfirmDialog';

// Register AG Grid community modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface LedgerGridProps {
  entries: LedgerEntry[];
  types: TransactionType[];
  distinctNames: string[];
  distinctDrivers: string[];
  onChange: () => void;
  showToast: (
    msg: string,
    type?: 'success' | 'error',
    action?: { label: string; onClick: () => void },
  ) => void;
}

// Type badge cell renderer
function TypeCellRenderer(props: any) {
  const value = props.value;
  if (!value) return null;
  const className = `type-badge type-badge--${value.toLowerCase().replace(/\s+/g, '')}`;
  return <span className={className}>{value}</span>;
}

// Amount cell renderer
function AmountCellRenderer(props: any) {
  const value = props.value;
  if (value === null || value === undefined || value === '') return null;
  return <span className="tabular-nums">{formatCurrency(value)}</span>;
}

// Date cell renderer
function DateCellRenderer(props: any) {
  return <span>{formatDateDisplay(props.value)}</span>;
}

// Delete button cell renderer
function DeleteCellRenderer(props: any) {
  if (props.data?._isNewRow) return null;
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (props.data?.id && props.context?.onDelete) {
      props.context.onDelete(props.data);
    }
  };
  return (
    <button
      className="grid-delete-btn"
      onClick={handleDelete}
      title="Delete entry"
    >
      <span className="material-icons-outlined grid-delete-btn__icon">delete_outline</span>
    </button>
  );
}

export function LedgerGrid({
  entries,
  types,
  distinctNames,
  distinctDrivers,
  onChange,
  showToast,
}: LedgerGridProps) {
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  const [newRowBillNo, setNewRowBillNo] = useState('');
  const [pendingDelete, setPendingDelete] = useState<LedgerEntry | null>(null);

  // Fetch next bill number
  useEffect(() => {
    window.api.getNextBillNo().then(setNewRowBillNo);
  }, [entries.length]);

  // Re-insert a just-deleted entry (Undo). Bill number is preserved.
  const undoDelete = useCallback(
    (entry: LedgerEntry) => {
      const { id, created_at, ...rest } = entry;
      window.api
        .insertEntry(rest)
        .then(() => {
          onChange();
          showToast('Delete undone');
        })
        .catch((err) => showToast(err instanceof Error ? err.message : 'Undo failed', 'error'));
    },
    [onChange, showToast]
  );

  // Step 1: ask for confirmation (styled dialog instead of native confirm()).
  const requestDelete = useCallback((data: LedgerEntry) => {
    if (data?.id) setPendingDelete(data);
  }, []);

  // Step 2: actually delete, then offer an Undo.
  const confirmDelete = useCallback(() => {
    const entry = pendingDelete;
    setPendingDelete(null);
    if (!entry?.id) return;
    window.api
      .deleteEntry(entry.id)
      .then(() => {
        onChange();
        showToast('Entry deleted', 'success', { label: 'Undo', onClick: () => undoDelete(entry) });
      })
      .catch((err) => showToast(err instanceof Error ? err.message : 'Delete failed', 'error'));
  }, [pendingDelete, onChange, showToast, undoDelete]);

  // Context object for cell renderers
  const gridContext = useMemo(() => ({ onDelete: requestDelete }), [requestDelete]);

  // Pinned bottom row for new entries
  const pinnedBottomRowData = useMemo(
    () => [
      {
        id: undefined,
        bill_no: newRowBillNo,
        date: todayISO(),
        name: '',
        type: '',
        phone: '',
        hours: null,
        driver_name: '',
        amount: null,
        notes: '',
        _isNewRow: true,
      },
    ],
    [newRowBillNo]
  );

  const typeNames = useMemo(() => types.map((t) => t.name), [types]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: '#',
        field: 'id',
        width: 55,
        editable: false,
        cellStyle: { color: 'var(--label-tertiary)', fontVariantNumeric: 'tabular-nums' },
        valueFormatter: (params: any) => {
          if (params.data?._isNewRow) return '+';
          return params.value || '';
        },
      },
      {
        headerName: 'Bill No',
        field: 'bill_no',
        width: 100,
        editable: true,
      },
      {
        headerName: 'Date',
        field: 'date',
        width: 120,
        editable: true,
        cellRenderer: DateCellRenderer,
        cellEditor: 'agTextCellEditor',
        valueParser: (params: any) => parseDateForStorage(params.newValue),
      },
      {
        headerName: 'Name',
        field: 'name',
        width: 160,
        editable: true,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: {
          useFormatter: false,
        },
      },
      {
        headerName: 'Type',
        field: 'type',
        width: 130,
        editable: true,
        cellRenderer: TypeCellRenderer,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: typeNames,
        },
      },
      {
        headerName: 'Phone',
        field: 'phone',
        width: 130,
        editable: true,
      },
      {
        headerName: 'Hours',
        field: 'hours',
        width: 80,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        cellStyle: { fontVariantNumeric: 'tabular-nums', justifyContent: 'flex-end' },
      },
      {
        headerName: 'Driver',
        field: 'driver_name',
        width: 140,
        editable: true,
      },
      {
        headerName: 'Amount',
        field: 'amount',
        width: 120,
        editable: true,
        cellRenderer: AmountCellRenderer,
        cellEditor: 'agNumberCellEditor',
        cellStyle: { justifyContent: 'flex-end' },
      },
      {
        headerName: 'Notes',
        field: 'notes',
        flex: 1,
        minWidth: 140,
        editable: true,
      },
      {
        headerName: '',
        field: '_actions',
        width: 44,
        editable: false,
        sortable: false,
        resizable: false,
        suppressMovable: true,
        cellRenderer: DeleteCellRenderer,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
        headerClass: 'ag-header-cell--actions',
      },
    ],
    [typeNames]
  );

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      suppressMovable: false,
    }),
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridApiRef.current = params.api;
  }, []);

  const handleCellEditingStopped = useCallback(
    async (event: CellEditingStoppedEvent) => {
      const data = event.data;
      if (!data) return;

      // Only save if the value actually changed
      if (event.oldValue === event.newValue && !data._isNewRow) return;

      // Validate before hitting the database; show the first problem inline.
      const problems = getEntryErrors(data);
      if (problems.length > 0) {
        // Only nag once the row has real content (avoids flagging an empty new row).
        const hasContent =
          data.name || data.type || data.phone || data.hours || data.amount || data.driver_name || data.notes;
        if (hasContent) showToast(problems[0].message, 'error');
        if (data._isNewRow) return;
      }

      try {
        if (data._isNewRow) {
          // Check if the user has entered meaningful data
          const hasData =
            data.name || data.type || data.phone || data.hours || data.amount || data.driver_name || data.notes;

          if (!hasData) return;

          // Insert new entry
          const { _isNewRow, ...entry } = data;
          await window.api.insertEntry(entry);
          showToast('Entry saved');
          onChange();
        } else if (data.id) {
          // Update existing entry
          await window.api.updateEntry(data);
          // Subtle confirmation that the row was persisted.
          if (event.node) event.api.flashCells({ rowNodes: [event.node] });
          onChange();
        }
      } catch (err) {
        console.error('Save error:', err);
        showToast(err instanceof Error ? err.message : 'Failed to save entry', 'error');
      }
    },
    [onChange, showToast]
  );

  const handleCellKeyDown = useCallback(
    (event: CellKeyDownEvent) => {
      const keyEvent = event.event as KeyboardEvent;
      if (!keyEvent) return;

      // Delete row with Ctrl+Delete
      if (keyEvent.key === 'Delete' && keyEvent.ctrlKey && event.data?.id) {
        requestDelete(event.data);
      }

      // Tab from last column on new row should insert and create new
      if (keyEvent.key === 'Tab' && event.data?._isNewRow && event.column?.getColId() === 'notes') {
        handleCellEditingStopped(event as any);
      }
    },
    [requestDelete, handleCellEditingStopped]
  );

  // Keyboard shortcuts (registered at the grid level)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N: Focus new row
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        const api = gridApiRef.current;
        if (api) {
          const pinnedRowCount = api.getPinnedBottomRowCount();
          if (pinnedRowCount > 0) {
            const pinnedNode = api.getPinnedBottomRow(0);
            if (pinnedNode) {
              api.ensureIndexVisible(0);
              api.setFocusedCell(pinnedNode.rowIndex!, 'bill_no', 'bottom');
              api.startEditingCell({
                rowIndex: pinnedNode.rowIndex!,
                colKey: 'bill_no',
                rowPinned: 'bottom',
              });
            }
          }
        }
      }

      // Ctrl+F: Focus search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input__field') as HTMLInputElement;
        searchInput?.focus();
      }

      // Ctrl+S: Commit the current edit (stopEditing triggers the save handler).
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        gridApiRef.current?.stopEditing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getRowStyle = useCallback((params: any) => {
    if (params.data?._isNewRow) {
      return { fontStyle: 'italic', opacity: 0.6 };
    }
    return undefined;
  }, []);

  return (
    <div className="ag-theme-logwise">
      <AgGridReact
        ref={gridRef}
        rowData={entries}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRowData}
        context={gridContext}
        onGridReady={onGridReady}
        onCellEditingStopped={handleCellEditingStopped}
        onCellKeyDown={handleCellKeyDown}
        getRowStyle={getRowStyle}
        animateRows={true}
        singleClickEdit={false}
        stopEditingWhenCellsLoseFocus={false}
        enterNavigatesVertically={true}
        enterNavigatesVerticallyAfterEdit={true}
        tabToNextCell={(params) => params.nextCellPosition}
        getRowId={(params) => params.data._isNewRow ? 'new-row' : String(params.data.id)}
        suppressClickEdit={false}
        undoRedoCellEditing={true}
        undoRedoCellEditingLimit={20}
      />
      {pendingDelete && (
        <ConfirmDialog
          title="Delete entry?"
          message={`This will permanently delete entry ${pendingDelete.bill_no || `#${pendingDelete.id}`}. You can undo immediately after.`}
          confirmLabel="Delete"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

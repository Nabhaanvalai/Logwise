import React, { useEffect } from 'react';

interface ShortcutsHelpProps {
  onClose: () => void;
}

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: 'Ctrl + N', action: 'New entry row' },
  { keys: 'Ctrl + S', action: 'Save current edit' },
  { keys: 'Ctrl + F', action: 'Focus search' },
  { keys: 'Ctrl + E', action: 'Export (Excel)' },
  { keys: 'Ctrl + Delete', action: 'Delete focused row' },
  { keys: 'Enter', action: 'Next cell / new row' },
  { keys: 'Tab', action: 'Next field' },
  { keys: '?', action: 'Toggle this help' },
];

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Keyboard Shortcuts</h2>
        <div className="shortcuts">
          {SHORTCUTS.map((s) => (
            <div className="shortcuts__row" key={s.keys}>
              <span className="shortcuts__action">{s.action}</span>
              <kbd className="shortcuts__keys">{s.keys}</kbd>
            </div>
          ))}
        </div>
        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

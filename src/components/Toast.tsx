import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  action?: { label: string; onClick: () => void };
}

export function Toast({ message, type, action }: ToastProps) {
  return (
    <div className={`toast toast--${type}`}>
      <span className="toast__icon material-icons-outlined">
        {type === 'success' ? 'check_circle' : 'error'}
      </span>
      <span className="toast__message">{message}</span>
      {action && (
        <button className="toast__action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

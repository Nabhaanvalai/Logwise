// Shared formatting helpers. Previously duplicated across Dashboard, StatusBar
// and LedgerGrid — centralised here so currency/date display stays consistent.

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a number as INR currency, e.g. 3500 -> "₹3,500". */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return currencyFormatter.format(amount);
}

/** Convert a stored YYYY-MM-DD date into the display form DD-MM-YYYY. */
export function formatDateDisplay(date: string): string {
  if (!date) return '';
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function todayISO(): string {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Parse a date typed by the user (DD-MM-YYYY or YYYY-MM-DD) into the canonical
 * YYYY-MM-DD storage form. Falls back to today's date for empty input.
 */
export function parseDateForStorage(input: string): string {
  if (!input) return todayISO();
  // Already canonical
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  // DD-MM-YYYY
  const parts = input.split('-');
  if (parts.length === 3 && parts[0].length <= 2) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return input;
}

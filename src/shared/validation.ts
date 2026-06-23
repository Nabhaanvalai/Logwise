// Domain validation for ledger entries. Pure functions shared by the renderer
// (instant inline feedback) and the main process (authoritative gate before a
// write actually hits SQLite).

import type { LedgerEntry } from './types';
import { type Result, ok, err } from './result';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface FieldError {
  field: keyof LedgerEntry;
  message: string;
}

/** Returns a list of field-level problems. Empty list == valid. */
export function getEntryErrors(entry: Partial<LedgerEntry>): FieldError[] {
  const errors: FieldError[] = [];

  // Date is the only strictly required field.
  if (!entry.date || !ISO_DATE.test(entry.date)) {
    errors.push({ field: 'date', message: 'Date is required (YYYY-MM-DD).' });
  } else if (Number.isNaN(Date.parse(entry.date))) {
    errors.push({ field: 'date', message: 'Date is not a real calendar date.' });
  }

  // Phone: optional, but if present must be a plausible phone number.
  if (entry.phone && !/^[\d\s+()-]{6,20}$/.test(entry.phone)) {
    errors.push({ field: 'phone', message: 'Phone may only contain digits and + ( ) - spaces.' });
  }

  // Amount: optional, but must be a non-negative number when set.
  if (entry.amount !== null && entry.amount !== undefined) {
    if (Number.isNaN(entry.amount) || entry.amount < 0) {
      errors.push({ field: 'amount', message: 'Amount must be zero or positive.' });
    }
  }

  // Hours: optional, but must be a non-negative number when set.
  if (entry.hours !== null && entry.hours !== undefined) {
    if (Number.isNaN(entry.hours) || entry.hours < 0) {
      errors.push({ field: 'hours', message: 'Hours must be zero or positive.' });
    }
  }

  return errors;
}

/** Result-style gate used by the main process before persisting. */
export function validateEntry(entry: Partial<LedgerEntry>): Result<true> {
  const errors = getEntryErrors(entry);
  if (errors.length === 0) return ok(true);
  return err(errors.map((e) => e.message).join(' '));
}

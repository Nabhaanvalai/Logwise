// A small "railway-oriented" result type used to carry success/failure across
// the IPC boundary without throwing across process lines. Main-process handlers
// return a Result; the preload bridge unwraps it (throwing on failure) so the
// renderer can use ordinary try/catch.

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(error: string): Result<never> {
  return { ok: false, error };
}

/**
 * Wraps a (possibly throwing) function so it always returns a Result instead of
 * throwing. Used to wrap every IPC handler in one place.
 */
export function tryResult<T>(fn: () => T): Result<T> {
  try {
    return ok(fn());
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

export async function tryResultAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

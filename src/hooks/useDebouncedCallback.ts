import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a debounced wrapper around `callback`. Calls are coalesced so the
 * underlying function only runs after `delay` ms of quiet. The latest callback
 * is always used, and any pending call is cancelled on unmount.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay = 250,
): (...args: A) => void {
  const callbackRef = useRef(callback);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Keep the ref pointed at the latest callback without resetting the timer.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clear any pending timer on unmount.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  );
}

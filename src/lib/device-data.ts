"use client";

const PREFIX = "rtnr:";

/**
 * Removes everything this app keeps in this browser's storage: the result, its
 * three row ids and the pending sign-up email. Sweeps the prefix rather than
 * naming the keys, so a future key isn't missed.
 */
export function clearDeviceData(): void {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    for (const key of keys) {
      if (key?.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Private mode or storage disabled: nothing was kept here to clear.
  }
}

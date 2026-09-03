"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribeTo(key: string) {
  return (listener: () => void) => {
    const set = listeners.get(key) ?? new Set();
    set.add(listener);
    listeners.set(key, set);
    // Keep other tabs in sync too.
    window.addEventListener("storage", listener);
    return () => {
      set.delete(listener);
      window.removeEventListener("storage", listener);
    };
  };
}

function readRaw(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Persistent state backed by localStorage, read through useSyncExternalStore so
 * the server render and the hydration pass always agree. `initial` must be a
 * stable reference (module constant), not an inline literal.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const subscribe = useMemo(() => subscribeTo(key), [key]);
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );

  const value = useMemo<T>(() => {
    if (raw === null) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  }, [raw, initial]);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      const current = (() => {
        const stored = readRaw(key);
        if (stored === null) return initial;
        try {
          return JSON.parse(stored) as T;
        } catch {
          return initial;
        }
      })();
      const resolved =
        typeof next === "function" ? (next as (c: T) => T)(current) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Storage full or blocked — nothing else to do.
      }
      emit(key);
    },
    [key, initial],
  );

  const hydrated = raw !== null || typeof window !== "undefined";

  return [value, update, hydrated] as const;
}

"use client";

import { useCallback, useEffect, useState } from "react";

export function useCustomOrder(storageKey: string): {
  order: string[];
  apply: <T extends { id: string }>(items: T[]) => T[];
  setOrder: (ids: string[]) => void;
} {
  const [order, setOrderState] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
          setOrderState(parsed);
        }
      }
    } catch {
      // localStorage not available / malformed — stay empty.
    }
  }, [storageKey]);

  const setOrder = useCallback(
    (ids: string[]) => {
      setOrderState(ids);
      try {
        localStorage.setItem(storageKey, JSON.stringify(ids));
      } catch {
        // Ignore quota / privacy-mode failures.
      }
    },
    [storageKey]
  );

  // Reorder items to match the stored order; items missing from it go last.
  const apply = useCallback(
    <T extends { id: string }>(items: T[]): T[] => {
      if (order.length === 0) return items;
      const index = new Map(order.map((id, i) => [id, i]));
      return [...items].sort((a, b) => {
        const ai = index.has(a.id) ? index.get(a.id)! : Number.MAX_SAFE_INTEGER;
        const bi = index.has(b.id) ? index.get(b.id)! : Number.MAX_SAFE_INTEGER;
        return ai - bi;
      });
    },
    [order]
  );

  return { order, apply, setOrder };
}

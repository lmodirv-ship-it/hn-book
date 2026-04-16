import { useState, useEffect, useCallback } from "react";

interface ReadingProgress {
  page: number;
  zoom: number;
  viewMode: string;
  timestamp: number;
}

const STORAGE_KEY = "hn-book-progress";

function getAll(): Record<string, ReadingProgress> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function useReadingProgress(bookId: string | undefined) {
  const [restored, setRestored] = useState(false);

  const getSaved = useCallback((): ReadingProgress | null => {
    if (!bookId) return null;
    return getAll()[bookId] || null;
  }, [bookId]);

  const save = useCallback(
    (page: number, zoom: number, viewMode: string) => {
      if (!bookId) return;
      const all = getAll();
      all[bookId] = { page, zoom, viewMode, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    },
    [bookId]
  );

  const clear = useCallback(() => {
    if (!bookId) return;
    const all = getAll();
    delete all[bookId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }, [bookId]);

  return { getSaved, save, clear, restored, setRestored };
}

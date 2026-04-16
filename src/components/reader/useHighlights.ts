import { useState, useEffect, useCallback } from "react";

export interface Highlight {
  id: string;
  page: number;
  text: string;
  color: string;
  createdAt: number;
}

const STORAGE_KEY = "hn-book-highlights";
const COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff"];

function getAll(): Record<string, Highlight[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function useHighlights(bookId: string | undefined) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    if (!bookId) return;
    setHighlights(getAll()[bookId] || []);
  }, [bookId]);

  const addHighlight = useCallback(
    (page: number, text: string, color: string = COLORS[0]) => {
      if (!bookId || !text.trim()) return;
      const all = getAll();
      const existing = all[bookId] || [];
      const newHighlight: Highlight = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        page,
        text: text.trim(),
        color,
        createdAt: Date.now(),
      };
      const updated = [...existing, newHighlight].sort((a, b) => a.page - b.page);
      all[bookId] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setHighlights(updated);
      return newHighlight;
    },
    [bookId]
  );

  const removeHighlight = useCallback(
    (highlightId: string) => {
      if (!bookId) return;
      const all = getAll();
      const updated = (all[bookId] || []).filter((h) => h.id !== highlightId);
      all[bookId] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setHighlights(updated);
    },
    [bookId]
  );

  return { highlights, addHighlight, removeHighlight, COLORS };
}

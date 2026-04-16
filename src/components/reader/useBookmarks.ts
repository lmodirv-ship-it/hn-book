import { useState, useEffect, useCallback } from "react";

export interface Bookmark {
  page: number;
  label: string;
  createdAt: number;
}

const STORAGE_KEY = "hn-book-bookmarks";

function getAll(): Record<string, Bookmark[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function useBookmarks(bookId: string | undefined) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    if (!bookId) return;
    setBookmarks(getAll()[bookId] || []);
  }, [bookId]);

  const addBookmark = useCallback(
    (page: number, label?: string) => {
      if (!bookId) return;
      const all = getAll();
      const existing = all[bookId] || [];
      if (existing.some((b) => b.page === page)) return; // already bookmarked
      const updated = [
        ...existing,
        { page, label: label || `صفحة ${page}`, createdAt: Date.now() },
      ].sort((a, b) => a.page - b.page);
      all[bookId] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setBookmarks(updated);
    },
    [bookId]
  );

  const removeBookmark = useCallback(
    (page: number) => {
      if (!bookId) return;
      const all = getAll();
      const updated = (all[bookId] || []).filter((b) => b.page !== page);
      all[bookId] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setBookmarks(updated);
    },
    [bookId]
  );

  const isBookmarked = useCallback(
    (page: number) => bookmarks.some((b) => b.page === page),
    [bookmarks]
  );

  return { bookmarks, addBookmark, removeBookmark, isBookmarked };
}

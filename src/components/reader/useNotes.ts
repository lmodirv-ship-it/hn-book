import { useState, useEffect, useCallback } from "react";

export interface Note {
  id: string;
  page: number;
  text: string;
  createdAt: number;
}

const STORAGE_KEY = "hn-book-notes";

function getAll(): Record<string, Note[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function useNotes(bookId: string | undefined) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!bookId) return;
    setNotes(getAll()[bookId] || []);
  }, [bookId]);

  const addNote = useCallback(
    (page: number, text: string) => {
      if (!bookId || !text.trim()) return;
      const all = getAll();
      const existing = all[bookId] || [];
      const newNote: Note = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        page,
        text: text.trim(),
        createdAt: Date.now(),
      };
      const updated = [...existing, newNote].sort((a, b) => a.page - b.page);
      all[bookId] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setNotes(updated);
    },
    [bookId]
  );

  const removeNote = useCallback(
    (noteId: string) => {
      if (!bookId) return;
      const all = getAll();
      const updated = (all[bookId] || []).filter((n) => n.id !== noteId);
      all[bookId] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setNotes(updated);
    },
    [bookId]
  );

  const getNotesForPage = useCallback(
    (page: number) => notes.filter((n) => n.page === page),
    [notes]
  );

  return { notes, addNote, removeNote, getNotesForPage };
}

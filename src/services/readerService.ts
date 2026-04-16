/**
 * Reader Service — abstracts reading progress, bookmarks, highlights, notes.
 * 
 * Import: import { readerService } from "@/services/readerService"
 * 
 * Currently backed by localStorage.
 * Migration: replace with API calls to persist per-user reading data server-side.
 */

import type { ApiResult } from "@/api/client";

// ─── Types ───────────────────────────────────────────────────

export interface ReadingProgress {
  bookId: string;
  page: number;
  zoom: number;
  viewMode: string;
  timestamp: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  page: number;
  label?: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  bookId: string;
  page: number;
  text: string;
  color: string;
  note?: string;
  createdAt: number;
}

export interface ReaderNote {
  id: string;
  bookId: string;
  page: number;
  content: string;
  createdAt: number;
}

export interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  paperColor: string;
  lineHeight: number;
  theme: "light" | "dark" | "sepia" | "green";
}

// ─── Storage Keys ────────────────────────────────────────────

const KEYS = {
  progress: "hn-book-progress",
  bookmarks: "hn-book-bookmarks",
  highlights: "hn-book-highlights",
  notes: "hn-book-notes",
  settings: "hn-book-reader-settings",
} as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: any): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Service ─────────────────────────────────────────────────

export const readerService = {
  // ── Progress ─────────────────────────────────────────────

  getProgress(bookId: string): ReadingProgress | null {
    const all = load<Record<string, ReadingProgress>>(KEYS.progress, {});
    return all[bookId] || null;
  },

  saveProgress(bookId: string, page: number, zoom: number, viewMode: string): void {
    const all = load<Record<string, ReadingProgress>>(KEYS.progress, {});
    all[bookId] = { bookId, page, zoom, viewMode, timestamp: Date.now() };
    save(KEYS.progress, all);
  },

  clearProgress(bookId: string): void {
    const all = load<Record<string, ReadingProgress>>(KEYS.progress, {});
    delete all[bookId];
    save(KEYS.progress, all);
  },

  // ── Bookmarks ────────────────────────────────────────────

  getBookmarks(bookId: string): Bookmark[] {
    const all = load<Record<string, Bookmark[]>>(KEYS.bookmarks, {});
    return all[bookId] || [];
  },

  addBookmark(bookId: string, page: number, label?: string): Bookmark {
    const all = load<Record<string, Bookmark[]>>(KEYS.bookmarks, {});
    const bm: Bookmark = { id: genId(), bookId, page, label, createdAt: Date.now() };
    all[bookId] = [...(all[bookId] || []), bm];
    save(KEYS.bookmarks, all);
    return bm;
  },

  removeBookmark(bookId: string, bookmarkId: string): void {
    const all = load<Record<string, Bookmark[]>>(KEYS.bookmarks, {});
    all[bookId] = (all[bookId] || []).filter((b) => b.id !== bookmarkId);
    save(KEYS.bookmarks, all);
  },

  // ── Highlights ───────────────────────────────────────────

  getHighlights(bookId: string): Highlight[] {
    const all = load<Record<string, Highlight[]>>(KEYS.highlights, {});
    return all[bookId] || [];
  },

  addHighlight(bookId: string, page: number, text: string, color: string, note?: string): Highlight {
    const all = load<Record<string, Highlight[]>>(KEYS.highlights, {});
    const hl: Highlight = { id: genId(), bookId, page, text, color, note, createdAt: Date.now() };
    all[bookId] = [...(all[bookId] || []), hl];
    save(KEYS.highlights, all);
    return hl;
  },

  removeHighlight(bookId: string, highlightId: string): void {
    const all = load<Record<string, Highlight[]>>(KEYS.highlights, {});
    all[bookId] = (all[bookId] || []).filter((h) => h.id !== highlightId);
    save(KEYS.highlights, all);
  },

  // ── Notes ────────────────────────────────────────────────

  getNotes(bookId: string): ReaderNote[] {
    const all = load<Record<string, ReaderNote[]>>(KEYS.notes, {});
    return all[bookId] || [];
  },

  addNote(bookId: string, page: number, content: string): ReaderNote {
    const all = load<Record<string, ReaderNote[]>>(KEYS.notes, {});
    const note: ReaderNote = { id: genId(), bookId, page, content, createdAt: Date.now() };
    all[bookId] = [...(all[bookId] || []), note];
    save(KEYS.notes, all);
    return note;
  },

  updateNote(bookId: string, noteId: string, content: string): void {
    const all = load<Record<string, ReaderNote[]>>(KEYS.notes, {});
    all[bookId] = (all[bookId] || []).map((n) =>
      n.id === noteId ? { ...n, content } : n
    );
    save(KEYS.notes, all);
  },

  removeNote(bookId: string, noteId: string): void {
    const all = load<Record<string, ReaderNote[]>>(KEYS.notes, {});
    all[bookId] = (all[bookId] || []).filter((n) => n.id !== noteId);
    save(KEYS.notes, all);
  },

  // ── Settings ─────────────────────────────────────────────

  getSettings(): ReaderSettings {
    return load<ReaderSettings>(KEYS.settings, {
      fontSize: 16,
      fontFamily: "serif",
      paperColor: "warm",
      lineHeight: 1.8,
      theme: "light",
    });
  },

  saveSettings(settings: Partial<ReaderSettings>): void {
    const current = readerService.getSettings();
    save(KEYS.settings, { ...current, ...settings });
  },
};

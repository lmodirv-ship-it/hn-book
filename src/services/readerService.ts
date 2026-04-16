/**
 * Reader Service — abstracts reading progress, bookmarks, highlights, notes, settings.
 * 
 * Import: import { readerService } from "@/services/readerService"
 * 
 * Currently backed by localStorage.
 * Migration: uncomment apiClient calls to persist per-user data server-side.
 */

import type { ApiResult } from "@/api/client";
// import { apiClient, ok, fail } from "@/api/client";

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

// ─── Storage Helpers ─────────────────────────────────────────

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

  saveProgress(bookId: string, page: number, zoom = 1, viewMode = "single"): void {
    // ── Current: localStorage ──
    const all = load<Record<string, ReadingProgress>>(KEYS.progress, {});
    all[bookId] = { bookId, page, zoom, viewMode, timestamp: Date.now() };
    save(KEYS.progress, all);

    // ── Future: REST API ──
    // apiClient.put(`/reader/${bookId}/progress`, { page, zoom, viewMode });
  },

  getProgress(bookId: string): ReadingProgress | null {
    // ── Current: localStorage ──
    const all = load<Record<string, ReadingProgress>>(KEYS.progress, {});
    return all[bookId] || null;

    // ── Future: REST API ──
    // const data = await apiClient.get(`/reader/${bookId}/progress`);
    // return data;
  },

  clearProgress(bookId: string): void {
    // ── Current: localStorage ──
    const all = load<Record<string, ReadingProgress>>(KEYS.progress, {});
    delete all[bookId];
    save(KEYS.progress, all);

    // ── Future: REST API ──
    // apiClient.del(`/reader/${bookId}/progress`);
  },

  // ── Bookmarks ────────────────────────────────────────────

  getBookmarks(bookId: string): Bookmark[] {
    // ── Current: localStorage ──
    const all = load<Record<string, Bookmark[]>>(KEYS.bookmarks, {});
    return all[bookId] || [];

    // ── Future: REST API ──
    // return apiClient.get(`/reader/${bookId}/bookmarks`);
  },

  addBookmark(bookId: string, page: number, label?: string): Bookmark {
    // ── Current: localStorage ──
    const all = load<Record<string, Bookmark[]>>(KEYS.bookmarks, {});
    const bm: Bookmark = { id: genId(), bookId, page, label, createdAt: Date.now() };
    all[bookId] = [...(all[bookId] || []), bm];
    save(KEYS.bookmarks, all);
    return bm;

    // ── Future: REST API ──
    // return apiClient.post(`/reader/${bookId}/bookmarks`, { page, label });
  },

  removeBookmark(bookId: string, bookmarkId: string): void {
    // ── Current: localStorage ──
    const all = load<Record<string, Bookmark[]>>(KEYS.bookmarks, {});
    all[bookId] = (all[bookId] || []).filter((b) => b.id !== bookmarkId);
    save(KEYS.bookmarks, all);

    // ── Future: REST API ──
    // apiClient.del(`/reader/${bookId}/bookmarks/${bookmarkId}`);
  },

  // ── Highlights ───────────────────────────────────────────

  getHighlights(bookId: string): Highlight[] {
    // ── Current: localStorage ──
    const all = load<Record<string, Highlight[]>>(KEYS.highlights, {});
    return all[bookId] || [];

    // ── Future: REST API ──
    // return apiClient.get(`/reader/${bookId}/highlights`);
  },

  addHighlight(bookId: string, page: number, text: string, color: string, note?: string): Highlight {
    // ── Current: localStorage ──
    const all = load<Record<string, Highlight[]>>(KEYS.highlights, {});
    const hl: Highlight = { id: genId(), bookId, page, text, color, note, createdAt: Date.now() };
    all[bookId] = [...(all[bookId] || []), hl];
    save(KEYS.highlights, all);
    return hl;

    // ── Future: REST API ──
    // return apiClient.post(`/reader/${bookId}/highlights`, { page, text, color, note });
  },

  removeHighlight(bookId: string, highlightId: string): void {
    // ── Current: localStorage ──
    const all = load<Record<string, Highlight[]>>(KEYS.highlights, {});
    all[bookId] = (all[bookId] || []).filter((h) => h.id !== highlightId);
    save(KEYS.highlights, all);

    // ── Future: REST API ──
    // apiClient.del(`/reader/${bookId}/highlights/${highlightId}`);
  },

  // ── Notes ────────────────────────────────────────────────

  getNotes(bookId: string): ReaderNote[] {
    // ── Current: localStorage ──
    const all = load<Record<string, ReaderNote[]>>(KEYS.notes, {});
    return all[bookId] || [];

    // ── Future: REST API ──
    // return apiClient.get(`/reader/${bookId}/notes`);
  },

  addNote(bookId: string, page: number, content: string): ReaderNote {
    // ── Current: localStorage ──
    const all = load<Record<string, ReaderNote[]>>(KEYS.notes, {});
    const note: ReaderNote = { id: genId(), bookId, page, content, createdAt: Date.now() };
    all[bookId] = [...(all[bookId] || []), note];
    save(KEYS.notes, all);
    return note;

    // ── Future: REST API ──
    // return apiClient.post(`/reader/${bookId}/notes`, { page, content });
  },

  updateNote(bookId: string, noteId: string, content: string): void {
    // ── Current: localStorage ──
    const all = load<Record<string, ReaderNote[]>>(KEYS.notes, {});
    all[bookId] = (all[bookId] || []).map((n) =>
      n.id === noteId ? { ...n, content } : n
    );
    save(KEYS.notes, all);

    // ── Future: REST API ──
    // apiClient.put(`/reader/${bookId}/notes/${noteId}`, { content });
  },

  removeNote(bookId: string, noteId: string): void {
    // ── Current: localStorage ──
    const all = load<Record<string, ReaderNote[]>>(KEYS.notes, {});
    all[bookId] = (all[bookId] || []).filter((n) => n.id !== noteId);
    save(KEYS.notes, all);

    // ── Future: REST API ──
    // apiClient.del(`/reader/${bookId}/notes/${noteId}`);
  },

  // ── Settings ─────────────────────────────────────────────

  getSettings(): ReaderSettings {
    // ── Current: localStorage ──
    return load<ReaderSettings>(KEYS.settings, {
      fontSize: 16,
      fontFamily: "serif",
      paperColor: "warm",
      lineHeight: 1.8,
      theme: "light",
    });

    // ── Future: REST API ──
    // return apiClient.get("/reader/settings");
  },

  saveSettings(settings: Partial<ReaderSettings>): void {
    // ── Current: localStorage ──
    const current = readerService.getSettings();
    save(KEYS.settings, { ...current, ...settings });

    // ── Future: REST API ──
    // apiClient.put("/reader/settings", settings);
  },
};

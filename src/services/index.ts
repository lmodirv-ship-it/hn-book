/**
 * HN-Book Service Layer
 * 
 * Central export — components import from here.
 * 
 * Architecture:
 *   src/api/client.ts      → raw backend client (swap for migration)
 *   src/services/           → business logic services
 *     authService.ts        → auth, profiles, roles
 *     bookService.ts        → books CRUD, filtering, categories
 *     readerService.ts      → reading progress, bookmarks, highlights, notes
 *     types.ts              → shared types (backend-agnostic)
 */

export { authService } from "./authService";
export { bookService } from "./bookService";
export { readerService } from "./readerService";

// Re-export types
export type {
  AppUser,
  AuthSession,
  AuthCredentials,
  RegisterData,
  Book,
  BookCreateInput,
  BookUpdateInput,
  BookFilter,
  Order,
  OrderCreateInput,
  OrderStatus,
  Customer,
  UserProfile,
  ProfileUpdateInput,
  AppRole,
  Coupon,
  UploadResult,
  ServiceResult,
} from "./types";

export type {
  ReadingProgress,
  Bookmark,
  Highlight,
  ReaderNote,
  ReaderSettings,
} from "./readerService";

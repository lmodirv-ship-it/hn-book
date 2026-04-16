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
export { categoryService } from "./categoryService";
export { readerService } from "./readerService";
export { storageService } from "./storageService";
export { accessService } from "./accessService";
export { aiService } from "./aiService";
export { couponService } from "./couponService";
export { printService } from "./printService";
export { tablouService } from "./tablouService";
export { orderService } from "./orderService";
export { recommendationService } from "./recommendationService";
export { documentService } from "./documentService";
export { adminService } from "./adminService";
export type { ClassifyInput, ClassifyResult, AIEngineStatus } from "./aiService";

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

export type { Category, CategoryCreateInput, CategoryUpdateInput } from "./categoryService";

export type {
  ReadingProgress,
  Bookmark,
  Highlight,
  ReaderNote,
  ReaderSettings,
} from "./readerService";

export type { UploadFileResult } from "./storageService";
export type { ProcessingResult, SavedDoc } from "./documentService";
export type { SmartAlert } from "./adminService";

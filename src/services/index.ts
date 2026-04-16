/**
 * HN-Book Service Layer
 * 
 * Central export for all services.
 * Components import from here instead of calling the backend directly.
 * 
 * Migration guide:
 * 1. Replace the implementation in each .service.ts file
 * 2. Keep the same function signatures and return types
 * 3. No changes needed in UI components
 */

export { authService } from "./auth.service";
export { booksService } from "./books.service";
export { ordersService } from "./orders.service";
export { storageService } from "./storage.service";

// Re-export types for convenience
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

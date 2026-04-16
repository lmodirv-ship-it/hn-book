/**
 * HN-Book Service Types
 * 
 * These types define the data models used across the application.
 * They are backend-agnostic — no dependency on any specific provider.
 * When migrating to a custom backend, these types remain unchanged.
 */

// ─── Auth ────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  phone?: string;
  createdAt?: string;
}

export interface AuthSession {
  user: AppUser;
  accessToken: string;
}

export type AuthEvent = 
  | "SIGNED_IN" 
  | "SIGNED_OUT" 
  | "TOKEN_REFRESHED" 
  | "INITIAL_SESSION";

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends AuthCredentials {
  displayName?: string;
}

// ─── Books / Products ────────────────────────────────────────

export interface Book {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  category: string;
  image: string;
  features: string[];
  badge?: string;
  isFlashDeal?: boolean;
  dealEndsIn?: number;
  referenceCode?: string;
  pdfUrl?: string;
  slug?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookCreateInput {
  name: string;
  description?: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  category: string;
  image?: string;
  features?: string[];
  badge?: string;
  isFlashDeal?: boolean;
  pdfUrl?: string;
}

export interface BookUpdateInput extends Partial<BookCreateInput> {
  isActive?: boolean;
}

export interface BookFilter {
  search?: string;
  category?: string;
  language?: string;
  limit?: number;
  offset?: number;
}

// ─── Orders ──────────────────────────────────────────────────

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  productId?: string;
  amount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  // Joined data
  customerName?: string;
  productName?: string;
}

export interface OrderCreateInput {
  orderNumber: string;
  customerId?: string;
  productId?: string;
  amount: number;
  status?: OrderStatus;
}

// ─── Customers ───────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  email: string;
  totalOrders?: number;
  totalSpent?: number;
  createdAt: string;
}

// ─── Profiles ────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateInput {
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
}

// ─── User Roles ──────────────────────────────────────────────

export type AppRole = "admin" | "user";

export interface UserRole {
  id: string;
  userId: string;
  role: AppRole;
}

// ─── Storage ─────────────────────────────────────────────────

export interface UploadResult {
  path: string;
  publicUrl: string;
}

// ─── Coupons ─────────────────────────────────────────────────

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  maxDiscount?: number;
  maxUses: number;
  currentUses: number;
  maxUsesPerUser: number;
  minOrderAmount: number;
  appliesTo: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Service Response ────────────────────────────────────────

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

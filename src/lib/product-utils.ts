import type { Tables } from "@/integrations/supabase/types";
import type { Product } from "@/lib/products";

type ProductRow = Tables<"products">;

export const hasPdfUrl = (pdfUrl?: string | null) =>
  typeof pdfUrl === "string" && pdfUrl.trim().length > 0;

export const mapProductRowToProduct = (product: ProductRow): Product => ({
  id: product.id,
  name: product.name,
  description: product.description || "",
  shortDescription: product.short_description || "",
  price: Number(product.price),
  originalPrice: product.original_price ? Number(product.original_price) : undefined,
  category: product.category,
  image: product.image || "",
  features: product.features || [],
  badge: product.badge || undefined,
  isFlashDeal: product.is_flash_deal || false,
  dealEndsIn: product.deal_ends_in || undefined,
  referenceCode: product.reference_code || undefined,
  pdfUrl: hasPdfUrl(product.pdf_url) ? product.pdf_url : undefined,
  pageCount: product.page_count ?? undefined,
});
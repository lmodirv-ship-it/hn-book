import { supabase } from "@/integrations/supabase/client";

const REFERENCE_CODE_PATTERN = /^[A-Z]\d{6}$/;
const REFERENCE_PREFIX = "B";

export const isReferenceCodeValid = (value?: string | null) =>
  typeof value === "string" && REFERENCE_CODE_PATTERN.test(value.trim().toUpperCase());

export const buildBookPdfStoragePath = (referenceCode: string) =>
  `books/${referenceCode}/${referenceCode}.pdf`;

export const getBookFilePublicUrl = (storagePath: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/book-files/${storagePath}`;

const normalizeReferenceCode = (value?: string | null) => value?.trim().toUpperCase() || "";

const isReferenceCodeAvailable = async (referenceCode: string, productId: string) => {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("reference_code", referenceCode)
    .maybeSingle();

  if (error) throw error;
  return !data || data.id === productId;
};

const assignReferenceCode = async (productId: string, referenceCode: string) => {
  const { error } = await supabase
    .from("products")
    .update({ reference_code: referenceCode } as never)
    .eq("id", productId);

  if (error) throw error;
  return referenceCode;
};

const generateRandomReferenceCode = () =>
  `${REFERENCE_PREFIX}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`;

export const ensureProductReferenceCode = async (
  productId: string,
  currentReferenceCode?: string | null,
  preferredReferenceCode?: string | null
) => {
  const currentCode = normalizeReferenceCode(currentReferenceCode);
  if (isReferenceCodeValid(currentCode)) return currentCode;

  const { data: product, error } = await supabase
    .from("products")
    .select("reference_code")
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;

  const storedCode = normalizeReferenceCode(product?.reference_code);
  if (isReferenceCodeValid(storedCode)) return storedCode;

  const preferredCode = normalizeReferenceCode(preferredReferenceCode);
  if (isReferenceCodeValid(preferredCode) && (await isReferenceCodeAvailable(preferredCode, productId))) {
    return assignReferenceCode(productId, preferredCode);
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateRandomReferenceCode();
    if (await isReferenceCodeAvailable(candidate, productId)) {
      return assignReferenceCode(productId, candidate);
    }
  }

  throw new Error("تعذر إنشاء رقم مرجعي فريد لهذا الكتاب");
};
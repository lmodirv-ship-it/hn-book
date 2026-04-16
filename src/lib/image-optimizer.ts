/**
 * Client-side image optimization.
 * Resizes to max 800px width and compresses to WebP ≤ 200KB.
 */

const MAX_WIDTH = 800;
const MAX_SIZE_BYTES = 200 * 1024; // 200KB
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.4;

/**
 * Load an image file into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Draw image onto a canvas, respecting max width.
 */
function drawToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  let width = img.naturalWidth;
  let height = img.naturalHeight;

  if (width > MAX_WIDTH) {
    height = Math.round((height * MAX_WIDTH) / width);
    width = MAX_WIDTH;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/**
 * Convert canvas to a WebP blob, iteratively reducing quality to stay under MAX_SIZE_BYTES.
 */
async function canvasToWebP(canvas: HTMLCanvasElement): Promise<Blob> {
  let quality = INITIAL_QUALITY;

  while (quality >= MIN_QUALITY) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );
    if (blob && blob.size <= MAX_SIZE_BYTES) return blob;
    quality -= 0.1;
  }

  // Final attempt at minimum quality
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", MIN_QUALITY)
  );
  if (blob) return blob;
  throw new Error("Failed to compress image");
}

/**
 * Optimize an image file: resize to max 800px width, convert to WebP, compress to ≤ 200KB.
 * Returns a new File object with .webp extension.
 */
export async function optimizeImage(file: File): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  // Skip SVGs — they're already optimized vectors
  if (file.type === "image/svg+xml") return file;

  // If already small WebP, skip
  if (file.type === "image/webp" && file.size <= MAX_SIZE_BYTES) return file;

  const img = await loadImage(file);
  const canvas = drawToCanvas(img);
  URL.revokeObjectURL(img.src);

  const blob = await canvasToWebP(canvas);

  // Build new filename with .webp extension
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

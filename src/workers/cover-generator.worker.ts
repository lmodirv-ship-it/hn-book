/**
 * Web Worker for cover generation using OffscreenCanvas.
 * Runs in background thread — zero UI blocking.
 */

const COVER_WIDTH = 400;
const COVER_HEIGHT = 600;

const GRADIENTS: [string, string][] = [
  ["#1e3a8a", "#9333ea"],
  ["#0f766e", "#1e40af"],
  ["#7c2d12", "#b91c1c"],
  ["#4c1d95", "#be185d"],
  ["#164e63", "#0e7490"],
  ["#1e3a5f", "#2563eb"],
];

function pickGradient(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function wrapText(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(/\s+/);
  let line = "";
  const lines: string[] = [];

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}

async function generateCover(title: string, referenceCode: string): Promise<Blob> {
  const canvas = new OffscreenCanvas(COVER_WIDTH, COVER_HEIGHT);
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const [color1, color2] = pickGradient(title);
  const gradient = ctx.createLinearGradient(0, 0, COVER_WIDTH, COVER_HEIGHT);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);

  // Decorative lines
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 80);
  ctx.lineTo(COVER_WIDTH - 40, 80);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(40, COVER_HEIGHT - 80);
  ctx.lineTo(COVER_WIDTH - 40, COVER_HEIGHT - 80);
  ctx.stroke();

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  wrapText(ctx, title, COVER_WIDTH / 2, COVER_HEIGHT / 2 - 20, COVER_WIDTH - 80, 36);

  // Reference code
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(referenceCode, COVER_WIDTH / 2, COVER_HEIGHT - 50);

  // Brand
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("HN Book", COVER_WIDTH / 2, COVER_HEIGHT - 30);

  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
}

// ── Message handler ──

self.onmessage = async (e: MessageEvent) => {
  const { id, title, referenceCode } = e.data;
  try {
    const blob = await generateCover(title, referenceCode);
    // Transfer the blob as ArrayBuffer for efficiency
    const buffer = await blob.arrayBuffer();
    (self as unknown as Worker).postMessage(
      { id, success: true, buffer },
      [buffer] // transferable
    );
  } catch (err: any) {
    (self as unknown as Worker).postMessage({
      id,
      success: false,
      error: err?.message || "Cover generation failed",
    });
  }
};

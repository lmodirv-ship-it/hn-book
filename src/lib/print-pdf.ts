import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Hybrid PDF export: html2canvas rasterizes the live editor DOM (preserving
 * Arabic shaping, ligatures, and webfonts exactly as on screen) at 300 DPI,
 * then jsPDF embeds the resulting PNG into a print-ready sheet with bleed
 * and crop marks. We deliberately avoid svg2pdf — it cannot shape Arabic.
 */
const TARGET_DPI = 300;
const SCREEN_DPI = 96;

export type PageSize = "A4" | "A3";

export interface PrintLayoutInfo {
  pageSize: PageSize;
  pageWidth: number;   // mm
  pageHeight: number;  // mm
  /** Trim card size (without bleed) — 85×55mm. */
  cardWidth: number;
  cardHeight: number;
  /** Bleed-extended card size used for placement on the sheet. */
  bleedWidth: number;
  bleedHeight: number;
  cols: number;
  rows: number;
  perPage: number;
  marginX: number;     // mm — outer page margin to first card
  marginY: number;
  gapX: number;        // mm — spacing between cards
  gapY: number;
  bleed: number;       // mm — per side
  safeMargin: number;  // mm — inner safe zone
}

// ── Print constants ──────────────────────────────────────────
const CARD_W = 85;        // mm — standard business card trim
const CARD_H = 55;        // mm
const BLEED = 3;          // mm per side → final 91×61mm
const SAFE = 3;           // mm inner safe area
const GAP = 5;            // mm between cards (room for crop marks)
const MIN_PAGE_MARGIN = 8; // mm minimum outer margin

export type ColorMode = "RGB" | "CMYK_SIM";
export type PaperFinish = "none" | "glossy" | "matte";

const PAGES: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
};

/** Fixed layout — A4 = 2×5 (10/page), A3 = 4×5 (20/page). */
const FIXED_GRID: Record<PageSize, { cols: number; rows: number }> = {
  A4: { cols: 2, rows: 5 },
  A3: { cols: 4, rows: 5 },
};

export function computeLayout(pageSize: PageSize): PrintLayoutInfo {
  const { w: pageWidth, h: pageHeight } = PAGES[pageSize];
  const bleedWidth = CARD_W + 2 * BLEED;   // 91
  const bleedHeight = CARD_H + 2 * BLEED;  // 61
  const { cols, rows } = FIXED_GRID[pageSize];

  // Pick the largest gap that still fits the fixed grid (>=2mm), then center.
  const maxGapX = cols > 1 ? (pageWidth - 2 * MIN_PAGE_MARGIN - cols * bleedWidth) / (cols - 1) : 0;
  const maxGapY = rows > 1 ? (pageHeight - 2 * MIN_PAGE_MARGIN - rows * bleedHeight) / (rows - 1) : 0;
  const gapX = Math.max(2, Math.min(GAP, maxGapX));
  const gapY = Math.max(2, Math.min(GAP, maxGapY));

  const usedW = cols * bleedWidth + (cols - 1) * gapX;
  const usedH = rows * bleedHeight + (rows - 1) * gapY;
  const marginX = (pageWidth - usedW) / 2;
  const marginY = (pageHeight - usedH) / 2;

  return {
    pageSize,
    pageWidth,
    pageHeight,
    cardWidth: CARD_W,
    cardHeight: CARD_H,
    bleedWidth,
    bleedHeight,
    cols,
    rows,
    perPage: cols * rows,
    marginX,
    marginY,
    gapX,
    gapY,
    bleed: BLEED,
    safeMargin: SAFE,
  };
}

// ── Rendering helpers ────────────────────────────────────────

/** Wait for all webfonts to be loaded so text renders correctly in exports. */
async function waitForFonts(): Promise<void> {
  try {
    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
  } catch (e) {
    console.warn("[print-pdf] fonts.ready failed (non-fatal)", e);
  }
}

/** Find the first <svg> element inside a node (the rendered card). */
function findSvg(node: HTMLElement): SVGSVGElement | null {
  if (!node) return null;
  if (node.tagName?.toLowerCase() === "svg") return node as unknown as SVGSVGElement;
  return node.querySelector("svg");
}

/**
 * Parse a fresh SVG clone from the live DOM with computed text styles inlined.
 * svg2pdf can mutate / consume the node it receives, so we always parse a fresh
 * copy from a serialized string instead of reusing the same DOM clone.
 */
function buildExportableSvg(svg: SVGSVGElement): SVGSVGElement {
  // Inline computed font + fill styles on text first (read from the live node).
  const sourceTexts = svg.querySelectorAll<SVGElement>("text, tspan");
  const styles: string[] = [];
  sourceTexts.forEach((src) => {
    const cs = window.getComputedStyle(src);
    styles.push(
      `font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};fill:${cs.fill || "#000"};`
    );
  });
  // Serialize → re-parse for an isolated, mutable clone.
  const serializer = new XMLSerializer();
  const xml = serializer.serializeToString(svg);
  const doc = new DOMParser().parseFromString(xml, "image/svg+xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) throw new Error("SVG parse error: " + parserError.textContent);
  const clone = doc.documentElement as unknown as SVGSVGElement;
  // Re-apply inline styles in the same order.
  clone.querySelectorAll<SVGElement>("text, tspan").forEach((dst, i) => {
    if (styles[i]) dst.setAttribute("style", styles[i]);
  });
  // Ensure width/height present so svg2pdf has a viewport.
  if (!clone.getAttribute("width") && svg.viewBox?.baseVal) {
    clone.setAttribute("width", String(svg.viewBox.baseVal.width || 850));
  }
  if (!clone.getAttribute("height") && svg.viewBox?.baseVal) {
    clone.setAttribute("height", String(svg.viewBox.baseVal.height || 550));
  }
  return clone;
}

/** Wrap a bare <svg> in an HTML container so html-to-image can rasterize it. */
function ensureHtmlWrapper(node: HTMLElement): { target: HTMLElement; cleanup: () => void } {
  const tag = node.tagName?.toLowerCase();
  if (tag !== "svg") return { target: node, cleanup: () => {} };
  const svg = node as unknown as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox?.baseVal;
  const w = rect.width || vb?.width || 850;
  const h = rect.height || vb?.height || 550;
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px;background:#fff;`;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  return { target: wrapper, cleanup: () => wrapper.remove() };
}

/** High-res PNG fallback (~600 DPI). Optionally clamps to CMYK-ish gamut.
 *  `skipFonts: true` avoids CORS errors when reading cross-origin stylesheets
 *  (Google Fonts), which was the silent cause of the previous failure. */
async function nodeToHiResPng(node: HTMLElement, colorMode: ColorMode): Promise<string> {
  const { target, cleanup } = ensureHtmlWrapper(node);
  try {
    const dataUrl = await toPng(target, {
      pixelRatio: 4,
      cacheBust: true,
      backgroundColor: "#ffffff",
      skipFonts: true,
      style: { transform: "none" },
    } as any);
    if (!dataUrl?.startsWith("data:image")) throw new Error("Raster export returned empty data URL");
    if (colorMode !== "CMYK_SIM") return dataUrl;
    return await simulateCmykOnPng(dataUrl);
  } finally {
    cleanup();
  }
}

/** Approximate CMYK gamut by reducing saturation ~12% and clamping pure RGB primaries. */
async function simulateCmykOnPng(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const d = data.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          d[i]     = Math.round(r * 0.88 + gray * 0.12);
          d[i + 1] = Math.round(g * 0.88 + gray * 0.12);
          d[i + 2] = Math.round(b * 0.88 + gray * 0.12);
        }
        ctx.putImageData(data, 0, 0);
        resolve(c.toDataURL("image/png", 1.0));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("Failed to load PNG for CMYK simulation"));
    img.src = dataUrl;
  });
}

/**
 * Draw one card at (x, y) — vector path preferred, raster fallback.
 * Card is drawn at trim size; bleed area around it is filled with the
 * card's edge content via simple background extension when raster.
 */
async function drawCard(
  pdf: jsPDF,
  node: HTMLElement,
  x: number,
  y: number,
  layout: PrintLayoutInfo,
  colorMode: ColorMode,
): Promise<void> {
  const svg = findSvg(node);
  if (svg && colorMode !== "CMYK_SIM") {
    let holder: HTMLDivElement | null = null;
    try {
      const clone = buildExportableSvg(svg);
      // svg2pdf needs the element attached to the DOM to read computed layout.
      holder = document.createElement("div");
      holder.style.cssText = "position:fixed;left:-99999px;top:0;opacity:0;pointer-events:none;";
      holder.appendChild(clone);
      document.body.appendChild(holder);
      await svg2pdf(clone, pdf, {
        x: x + layout.bleed,
        y: y + layout.bleed,
        width: layout.cardWidth,
        height: layout.cardHeight,
      });
      return;
    } catch (err) {
      console.warn("[print-pdf] vector export failed at", { x, y }, err);
    } finally {
      holder?.remove();
    }
  }
  // Hybrid fallback — high-res raster from the live DOM node.
  try {
    const png = await nodeToHiResPng(node, colorMode);
    pdf.addImage(
      png,
      "PNG",
      x + layout.bleed,
      y + layout.bleed,
      layout.cardWidth,
      layout.cardHeight,
      undefined,
      "SLOW",
    );
  } catch (err) {
    console.error("[print-pdf] raster fallback also failed at", { x, y }, err);
    // Last-resort: draw a placeholder rectangle so the page still renders.
    pdf.setFillColor(245, 245, 245);
    pdf.rect(x + layout.bleed, y + layout.bleed, layout.cardWidth, layout.cardHeight, "F");
    pdf.setTextColor(150);
    pdf.setFontSize(8);
    pdf.text("render error", x + layout.bleed + 5, y + layout.bleed + 8);
  }
}

/** Subtle finish simulation overlay — gloss = top highlight, matte = soft tint. */
function drawFinishOverlay(pdf: jsPDF, x: number, y: number, layout: PrintLayoutInfo, finish: PaperFinish) {
  if (finish === "none") return;
  const tx = x + layout.bleed;
  const ty = y + layout.bleed;
  const tw = layout.cardWidth;
  const th = layout.cardHeight;
  const GS = (pdf as any).GState;
  if (GS) (pdf as any).setGState(new GS({ opacity: finish === "glossy" ? 0.08 : 0.05 }));
  if (finish === "glossy") {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(tx, ty, tw, th / 2, "F");
  } else {
    pdf.setFillColor(225, 225, 225);
    pdf.rect(tx, ty, tw, th, "F");
  }
  if (GS) (pdf as any).setGState(new GS({ opacity: 1 }));
}

/** Crop marks at the trim box corners (sit in the bleed area). */
function drawCropMarks(pdf: jsPDF, x: number, y: number, layout: PrintLayoutInfo) {
  const len = 3; // mm
  const off = 0.5;
  const tx = x + layout.bleed;        // trim x
  const ty = y + layout.bleed;        // trim y
  const tw = layout.cardWidth;
  const th = layout.cardHeight;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.12);
  // top-left
  pdf.line(tx - len, ty, tx - off, ty);
  pdf.line(tx, ty - len, tx, ty - off);
  // top-right
  pdf.line(tx + tw + off, ty, tx + tw + len, ty);
  pdf.line(tx + tw, ty - len, tx + tw, ty - off);
  // bottom-left
  pdf.line(tx - len, ty + th, tx - off, ty + th);
  pdf.line(tx, ty + th + off, tx, ty + th + len);
  // bottom-right
  pdf.line(tx + tw + off, ty + th, tx + tw + len, ty + th);
  pdf.line(tx + tw, ty + th + off, tx + tw, ty + th + len);
}

/** Page-level registration marks for duplex alignment. */
function drawRegistrationMarks(pdf: jsPDF, layout: PrintLayoutInfo) {
  const { pageWidth, pageHeight } = layout;
  const m = 5; // mm from corner
  const r = 1.5;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.15);
  const corners: Array<[number, number]> = [
    [m, m],
    [pageWidth - m, m],
    [m, pageHeight - m],
    [pageWidth - m, pageHeight - m],
  ];
  corners.forEach(([cx, cy]) => {
    pdf.circle(cx, cy, r);
    pdf.line(cx - r - 1, cy, cx + r + 1, cy);
    pdf.line(cx, cy - r - 1, cx, cy + r + 1);
  });
}

// ── Public API ───────────────────────────────────────────────

export interface BuildPrintPdfOptions {
  frontNode: HTMLElement;
  backNode?: HTMLElement | null;
  pageSize: PageSize;
  cutMarks?: boolean;
  registrationMarks?: boolean;
  /** Mirror columns on back page for long-edge duplex printing. Default true. */
  mirrorBack?: boolean;
  /** Color mode — RGB (default, vector) or CMYK_SIM (raster + gamut clamp). */
  colorMode?: ColorMode;
  /** Paper finish simulation overlaid on each card. */
  finish?: PaperFinish;
  /** Extra inner page margin (mm) to compensate for printers that crop edges. */
  marginCompensation?: number;
  fileName?: string;
}

export interface BuildPrintPdfResult {
  blob: Blob;
  url: string;
  fileName: string;
  layout: PrintLayoutInfo;
  totalCards: number;
}

export async function buildPrintReadyPdf(opts: BuildPrintPdfOptions): Promise<BuildPrintPdfResult> {
  const {
    frontNode,
    backNode,
    pageSize,
    cutMarks = true,
    registrationMarks = true,
    mirrorBack = true,
    colorMode = "RGB",
    finish = "none",
    marginCompensation = 0,
  } = opts;

  if (!frontNode) throw new Error("لا يوجد عنصر تصميم للتصدير (frontNode)");
  if (!frontNode.isConnected) throw new Error("عنصر التصميم غير مرفق بالـ DOM");

  console.info("[print-pdf] starting export", { pageSize, colorMode, finish, hasBack: !!backNode, marginCompensation });
  await waitForFonts();

  const baseLayout = computeLayout(pageSize);
  // Apply printer margin compensation by shrinking the printable area uniformly.
  const layout: PrintLayoutInfo = marginCompensation > 0
    ? { ...baseLayout, marginX: baseLayout.marginX + marginCompensation, marginY: baseLayout.marginY + marginCompensation }
    : baseLayout;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: pageSize.toLowerCase() as "a4" | "a3",
    compress: true,
  });

  await renderPage(pdf, frontNode, layout, { mirror: false, cutMarks, registrationMarks, colorMode, finish });

  if (backNode) {
    pdf.addPage(pageSize.toLowerCase() as "a4" | "a3", "portrait");
    await renderPage(pdf, backNode, layout, { mirror: mirrorBack, cutMarks, registrationMarks, colorMode, finish });
  }

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const fileName = opts.fileName ?? `print-cards-${pageSize}-${Date.now()}.pdf`;
  return { blob, url, fileName, layout, totalCards: layout.perPage };
}

interface RenderPageOpts {
  mirror: boolean;
  cutMarks: boolean;
  registrationMarks: boolean;
  colorMode: ColorMode;
  finish: PaperFinish;
}

async function renderPage(
  pdf: jsPDF,
  node: HTMLElement,
  layout: PrintLayoutInfo,
  { mirror, cutMarks, registrationMarks, colorMode, finish }: RenderPageOpts,
): Promise<void> {
  const { cols, rows, bleedWidth, bleedHeight, marginX, marginY, gapX, gapY } = layout;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const col = mirror ? cols - 1 - c : c;
      const x = marginX + col * (bleedWidth + gapX);
      const y = marginY + r * (bleedHeight + gapY);
      try {
        await drawCard(pdf, node, x, y, layout, colorMode);
        drawFinishOverlay(pdf, x, y, layout, finish);
      } catch (err) {
        console.error("[print-pdf] failed to draw card, skipping", err);
      }
      if (cutMarks) drawCropMarks(pdf, x, y, layout);
    }
  }
  if (registrationMarks) drawRegistrationMarks(pdf, layout);
}

/** Export a single card node as a high-resolution PNG (300+ DPI). */
export async function exportCardAsPng(
  node: HTMLElement,
  fileName = `card-${Date.now()}.png`,
): Promise<{ blob: Blob; url: string; fileName: string }> {
  if (!node) throw new Error("لا يوجد عنصر تصميم للتصدير");
  await waitForFonts();
  const { target, cleanup } = ensureHtmlWrapper(node);
  try {
    const dataUrl = await toPng(target, {
      pixelRatio: 6,
      cacheBust: true,
      backgroundColor: "#ffffff",
      skipFonts: true,
    } as any);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return { blob, url, fileName };
  } finally {
    cleanup();
  }
}

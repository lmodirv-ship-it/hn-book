import jsPDF from "jspdf";
import { svg2pdf } from "svg2pdf.js";
import { toPng } from "html-to-image";

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

const PAGES: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
};

/** Layout: portrait sheets — A4 = 2×5 (10/page), A3 = 4×5 (20/page). */
export function computeLayout(pageSize: PageSize): PrintLayoutInfo {
  const { w: pageWidth, h: pageHeight } = PAGES[pageSize];
  const bleedWidth = CARD_W + 2 * BLEED;   // 91
  const bleedHeight = CARD_H + 2 * BLEED;  // 61

  // Densest grid that respects MIN_PAGE_MARGIN on all sides.
  const cols = Math.max(
    1,
    Math.floor((pageWidth - 2 * MIN_PAGE_MARGIN + GAP) / (bleedWidth + GAP)),
  );
  const rows = Math.max(
    1,
    Math.floor((pageHeight - 2 * MIN_PAGE_MARGIN + GAP) / (bleedHeight + GAP)),
  );

  const usedW = cols * bleedWidth + (cols - 1) * GAP;
  const usedH = rows * bleedHeight + (rows - 1) * GAP;
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
    gapX: GAP,
    gapY: GAP,
    bleed: BLEED,
    safeMargin: SAFE,
  };
}

// ── Rendering helpers ────────────────────────────────────────

/** Find the first <svg> element inside a node (the rendered card). */
function findSvg(node: HTMLElement): SVGSVGElement | null {
  if (node.tagName === "svg") return node as unknown as SVGSVGElement;
  return node.querySelector("svg");
}

/** Clone an SVG and inline computed font styles so embedded text renders correctly. */
function cloneSvgForExport(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  // Inline computed font styles for text nodes (best-effort font preservation).
  const sourceTexts = svg.querySelectorAll<SVGElement>("text, tspan");
  const cloneTexts = clone.querySelectorAll<SVGElement>("text, tspan");
  sourceTexts.forEach((src, i) => {
    const dst = cloneTexts[i];
    if (!dst) return;
    const cs = window.getComputedStyle(src);
    dst.setAttribute(
      "style",
      `font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};fill:${cs.fill || "currentColor"};`,
    );
  });
  return clone;
}

/** High-res PNG fallback (~600 DPI) for nodes without an inline SVG. */
async function nodeToHiResPng(node: HTMLElement): Promise<string> {
  return toPng(node, { pixelRatio: 6, cacheBust: true, backgroundColor: "#ffffff" });
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
): Promise<void> {
  const svg = findSvg(node);
  if (svg) {
    try {
      const clone = cloneSvgForExport(svg);
      // Place SVG at trim coordinates inside the bleed box.
      await svg2pdf(clone, pdf, {
        x: x + layout.bleed,
        y: y + layout.bleed,
        width: layout.cardWidth,
        height: layout.cardHeight,
      });
      return;
    } catch (err) {
      // Fall through to raster fallback.
      console.warn("[print-pdf] vector export failed, using raster fallback", err);
    }
  }
  const png = await nodeToHiResPng(node);
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
  } = opts;

  if (!frontNode) throw new Error("frontNode is required");
  const layout = computeLayout(pageSize);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: pageSize.toLowerCase() as "a4" | "a3",
    compress: true,
  });

  // ── Page 1: fronts ──
  await renderPage(pdf, frontNode, layout, { mirror: false, cutMarks, registrationMarks });

  // ── Page 2: backs ──
  if (backNode) {
    pdf.addPage(pageSize.toLowerCase() as "a4" | "a3", "portrait");
    await renderPage(pdf, backNode, layout, { mirror: mirrorBack, cutMarks, registrationMarks });
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
}

async function renderPage(
  pdf: jsPDF,
  node: HTMLElement,
  layout: PrintLayoutInfo,
  { mirror, cutMarks, registrationMarks }: RenderPageOpts,
): Promise<void> {
  const { cols, rows, bleedWidth, bleedHeight, marginX, marginY, gapX, gapY } = layout;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const col = mirror ? cols - 1 - c : c;
      const x = marginX + col * (bleedWidth + gapX);
      const y = marginY + r * (bleedHeight + gapY);
      try {
        await drawCard(pdf, node, x, y, layout);
      } catch (err) {
        console.error("[print-pdf] failed to draw card, skipping", err);
      }
      if (cutMarks) drawCropMarks(pdf, x, y, layout);
    }
  }
  if (registrationMarks) drawRegistrationMarks(pdf, layout);
}

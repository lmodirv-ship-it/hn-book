import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export type PageSize = "A4" | "A3";

export interface PrintLayoutInfo {
  pageSize: PageSize;
  pageWidth: number;   // mm
  pageHeight: number;  // mm
  cardWidth: number;   // mm
  cardHeight: number;  // mm
  cols: number;
  rows: number;
  perPage: number;
  marginX: number;     // mm
  marginY: number;     // mm
  gapX: number;        // mm
  gapY: number;        // mm
}

const CARD_W = 85; // mm (standard business card)
const CARD_H = 55; // mm
const GAP = 4;     // mm spacing between cards (cut/bleed safe)

const PAGES: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
};

/** Compute how many cards fit per page in landscape orientation. */
export function computeLayout(pageSize: PageSize): PrintLayoutInfo {
  // landscape — wider page suits horizontal cards
  const { w: portraitW, h: portraitH } = PAGES[pageSize];
  const pageWidth = portraitH;
  const pageHeight = portraitW;

  const cols = Math.max(1, Math.floor((pageWidth + GAP) / (CARD_W + GAP)));
  const rows = Math.max(1, Math.floor((pageHeight + GAP) / (CARD_H + GAP)));

  const usedW = cols * CARD_W + (cols - 1) * GAP;
  const usedH = rows * CARD_H + (rows - 1) * GAP;
  const marginX = (pageWidth - usedW) / 2;
  const marginY = (pageHeight - usedH) / 2;

  return {
    pageSize,
    pageWidth,
    pageHeight,
    cardWidth: CARD_W,
    cardHeight: CARD_H,
    cols,
    rows,
    perPage: cols * rows,
    marginX,
    marginY,
    gapX: GAP,
    gapY: GAP,
  };
}

/** Render a DOM node to a high-res PNG data URL (≈300 DPI for an 85mm card). */
async function nodeToHiResPng(node: HTMLElement): Promise<string> {
  // 300 DPI on an 85mm wide card ≈ 1004 px. node is rendered at ~900px → pixelRatio 4 keeps it sharp.
  return toPng(node, { pixelRatio: 4, cacheBust: true, backgroundColor: "#ffffff" });
}

/** Place the same image in a grid on the current PDF page. */
function placeGrid(pdf: jsPDF, dataUrl: string, layout: PrintLayoutInfo, withCutMarks: boolean) {
  const { cols, rows, cardWidth, cardHeight, marginX, marginY, gapX, gapY } = layout;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = marginX + c * (cardWidth + gapX);
      const y = marginY + r * (cardHeight + gapY);
      pdf.addImage(dataUrl, "PNG", x, y, cardWidth, cardHeight, undefined, "FAST");
      if (withCutMarks) drawCutMarks(pdf, x, y, cardWidth, cardHeight);
    }
  }
}

function drawCutMarks(pdf: jsPDF, x: number, y: number, w: number, h: number) {
  const len = 3; // mm
  pdf.setDrawColor(120);
  pdf.setLineWidth(0.1);
  // 4 corners — small ticks outside the card
  // top-left
  pdf.line(x - len, y, x - 0.5, y);
  pdf.line(x, y - len, x, y - 0.5);
  // top-right
  pdf.line(x + w + 0.5, y, x + w + len, y);
  pdf.line(x + w, y - len, x + w, y - 0.5);
  // bottom-left
  pdf.line(x - len, y + h, x - 0.5, y + h);
  pdf.line(x, y + h + 0.5, x, y + h + len);
  // bottom-right
  pdf.line(x + w + 0.5, y + h, x + w + len, y + h);
  pdf.line(x + w, y + h + 0.5, x + w, y + h + len);
}

export interface BuildPrintPdfOptions {
  frontNode: HTMLElement;
  backNode?: HTMLElement | null;
  pageSize: PageSize;
  cutMarks?: boolean;
  fileName?: string;
}

export interface BuildPrintPdfResult {
  blob: Blob;
  url: string;
  fileName: string;
  layout: PrintLayoutInfo;
  totalCards: number;
}

/** Build a print-ready PDF: page 1 = N fronts, page 2 = N backs aligned for duplex printing. */
export async function buildPrintReadyPdf(opts: BuildPrintPdfOptions): Promise<BuildPrintPdfResult> {
  const { frontNode, backNode, pageSize, cutMarks = true } = opts;
  const layout = computeLayout(pageSize);

  const frontPng = await nodeToHiResPng(frontNode);
  const backPng = backNode ? await nodeToHiResPng(backNode) : null;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: pageSize.toLowerCase() as "a4" | "a3",
    compress: true,
  });

  placeGrid(pdf, frontPng, layout, cutMarks);

  if (backPng) {
    pdf.addPage(pageSize.toLowerCase() as "a4" | "a3", "landscape");
    // For duplex (long-edge) printing on landscape pages, mirror columns horizontally
    // so card #1 front aligns with card #1 back on the reverse side.
    const mirroredLayout = { ...layout };
    placeGridMirrored(pdf, backPng, mirroredLayout, cutMarks);
  }

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const fileName = opts.fileName ?? `print-cards-${pageSize}-${Date.now()}.pdf`;
  return { blob, url, fileName, layout, totalCards: layout.perPage };
}

/** Same as placeGrid but reverses column order so duplex prints align. */
function placeGridMirrored(pdf: jsPDF, dataUrl: string, layout: PrintLayoutInfo, withCutMarks: boolean) {
  const { cols, rows, cardWidth, cardHeight, marginX, marginY, gapX, gapY } = layout;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const mirroredCol = cols - 1 - c;
      const x = marginX + mirroredCol * (cardWidth + gapX);
      const y = marginY + r * (cardHeight + gapY);
      pdf.addImage(dataUrl, "PNG", x, y, cardWidth, cardHeight, undefined, "FAST");
      if (withCutMarks) drawCutMarks(pdf, x, y, cardWidth, cardHeight);
    }
  }
}

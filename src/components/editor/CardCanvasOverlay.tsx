/**
 * CardCanvasOverlay — visual print-spec guides for the editor canvas.
 *
 * Overlays bleed (red), trim (the card edge itself), safe zone (green dashed),
 * and corner crop marks on top of the rendered card so designers can see
 * exactly what will print and what risks being cut. All overlays are purely
 * visual — they do not appear in exports.
 *
 * Sizes are expressed in millimetres and rendered via a px-per-mm ratio so the
 * guides scale exactly with the visual card width.
 */
import { Toggle } from "@/components/ui/toggle";
import { Eye, Crop, Shield } from "lucide-react";

export interface CardSize {
  /** Stable id, e.g. "85x55" or "custom". */
  id: string;
  label: string;
  /** Trim width in mm. */
  widthMm: number;
  /** Trim height in mm. */
  heightMm: number;
}

export const CARD_SIZE_PRESETS: CardSize[] = [
  { id: "85x55", label: "85 × 55 mm (قياسي)", widthMm: 85, heightMm: 55 },
  { id: "90x50", label: "90 × 50 mm (أوروبي)", widthMm: 90, heightMm: 50 },
  { id: "85x54", label: "85 × 54 mm (ISO/CR80)", widthMm: 85, heightMm: 54 },
];

export interface PrintGuideToggles {
  bleed: boolean;
  safe: boolean;
  cropMarks: boolean;
}

export const DEFAULT_GUIDES: PrintGuideToggles = {
  bleed: true,
  safe: true,
  cropMarks: true,
};

interface OverlayProps {
  /** Card width on screen (px). */
  pxWidth: number;
  /** Card height on screen (px). */
  pxHeight: number;
  /** Card width in mm — used to compute px/mm ratio. */
  widthMm: number;
  bleedMm?: number;
  safeMm?: number;
  guides: PrintGuideToggles;
}

/**
 * Renders the bleed + safe-zone + crop-mark guides as an absolutely-positioned
 * overlay. The parent must be `position: relative`. The overlay is purely
 * decorative — it has `pointer-events-none`.
 */
export function CardCanvasOverlay({
  pxWidth,
  pxHeight,
  widthMm,
  bleedMm = 3,
  safeMm = 3,
  guides,
}: OverlayProps) {
  const pxPerMm = pxWidth / widthMm;
  const bleedPx = bleedMm * pxPerMm;
  const safePx = safeMm * pxPerMm;
  const markLen = Math.max(8, bleedPx * 0.9);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ width: pxWidth, height: pxHeight }}
    >
      {/* BLEED — red dashed frame extending OUTSIDE the trim */}
      {guides.bleed && (
        <div
          className="absolute border-2 border-dashed"
          style={{
            top: -bleedPx,
            left: -bleedPx,
            width: pxWidth + bleedPx * 2,
            height: pxHeight + bleedPx * 2,
            borderColor: "hsl(0 84% 60% / 0.7)",
          }}
        >
          <span
            className="absolute -top-5 left-0 text-[10px] font-mono px-1 rounded"
            style={{ background: "hsl(0 84% 60%)", color: "white" }}
          >
            Bleed +{bleedMm}mm
          </span>
        </div>
      )}

      {/* SAFE ZONE — green dashed frame INSIDE the trim */}
      {guides.safe && (
        <div
          className="absolute border border-dashed"
          style={{
            top: safePx,
            left: safePx,
            width: pxWidth - safePx * 2,
            height: pxHeight - safePx * 2,
            borderColor: "hsl(142 71% 45% / 0.8)",
          }}
        >
          <span
            className="absolute -bottom-5 right-0 text-[10px] font-mono px-1 rounded"
            style={{ background: "hsl(142 71% 45%)", color: "white" }}
          >
            Safe −{safeMm}mm
          </span>
        </div>
      )}

      {/* CROP MARKS — solid black ticks at the trim corners */}
      {guides.cropMarks && (
        <svg
          className="absolute"
          style={{
            top: -markLen,
            left: -markLen,
            width: pxWidth + markLen * 2,
            height: pxHeight + markLen * 2,
            overflow: "visible",
          }}
        >
          {[
            // top-left
            { x1: 0, y1: markLen, x2: markLen - 2, y2: markLen },
            { x1: markLen, y1: 0, x2: markLen, y2: markLen - 2 },
            // top-right
            { x1: markLen + pxWidth + 2, y1: markLen, x2: pxWidth + markLen * 2, y2: markLen },
            { x1: markLen + pxWidth, y1: 0, x2: markLen + pxWidth, y2: markLen - 2 },
            // bottom-left
            { x1: 0, y1: markLen + pxHeight, x2: markLen - 2, y2: markLen + pxHeight },
            { x1: markLen, y1: markLen + pxHeight + 2, x2: markLen, y2: pxHeight + markLen * 2 },
            // bottom-right
            { x1: markLen + pxWidth + 2, y1: markLen + pxHeight, x2: pxWidth + markLen * 2, y2: markLen + pxHeight },
            { x1: markLen + pxWidth, y1: markLen + pxHeight + 2, x2: markLen + pxWidth, y2: pxHeight + markLen * 2 },
          ].map((l, i) => (
            <line key={i} {...l} stroke="hsl(var(--foreground))" strokeWidth={1.2} />
          ))}
        </svg>
      )}
    </div>
  );
}

interface GuideTogglesBarProps {
  guides: PrintGuideToggles;
  onChange: (g: PrintGuideToggles) => void;
}

/** Compact toggle group for showing/hiding each guide layer. */
export function GuideTogglesBar({ guides, onChange }: GuideTogglesBarProps) {
  return (
    <div className="flex items-center gap-1 border border-border rounded-md h-8 px-1 bg-background/60">
      <Toggle
        size="sm"
        pressed={guides.bleed}
        onPressedChange={(v) => onChange({ ...guides, bleed: v })}
        title="إظهار/إخفاء الحدّ الزائد (Bleed)"
        className="h-6 px-1.5 data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive"
      >
        <Crop className="w-3.5 h-3.5" />
        <span className="text-[10px] mr-1">Bleed</span>
      </Toggle>
      <Toggle
        size="sm"
        pressed={guides.safe}
        onPressedChange={(v) => onChange({ ...guides, safe: v })}
        title="إظهار/إخفاء المنطقة الآمنة (Safe Zone)"
        className="h-6 px-1.5 data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-600"
      >
        <Shield className="w-3.5 h-3.5" />
        <span className="text-[10px] mr-1">Safe</span>
      </Toggle>
      <Toggle
        size="sm"
        pressed={guides.cropMarks}
        onPressedChange={(v) => onChange({ ...guides, cropMarks: v })}
        title="إظهار/إخفاء علامات القص"
        className="h-6 px-1.5"
      >
        <Eye className="w-3.5 h-3.5" />
        <span className="text-[10px] mr-1">Crop</span>
      </Toggle>
    </div>
  );
}

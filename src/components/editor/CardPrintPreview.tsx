import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CardPrintPreviewProps {
  /** Live editor card node (front). Will be visually overlaid with print guides. */
  frontNode: HTMLElement | null;
  showBleed: boolean;
  showSafe: boolean;
  showCrop: boolean;
  onToggle: (key: "bleed" | "safe" | "crop", value: boolean) => void;
}

/**
 * Visual overlay that mirrors the trim/bleed/safe geometry from print-pdf.ts.
 * Card trim is 85×55mm, bleed adds 3mm per side (final 91×61mm), safe area
 * shrinks 3mm from trim. Rendered at 4 px/mm so it fits inside the dialog.
 */
const PX_PER_MM = 4;
const CARD_W_MM = 85;
const CARD_H_MM = 55;
const BLEED_MM = 3;
const SAFE_MM = 3;

export const CardPrintPreview = ({ showBleed, showSafe, showCrop, onToggle }: CardPrintPreviewProps) => {
  const trimW = CARD_W_MM * PX_PER_MM;
  const trimH = CARD_H_MM * PX_PER_MM;
  const bleed = BLEED_MM * PX_PER_MM;
  const safe = SAFE_MM * PX_PER_MM;
  const totalW = trimW + bleed * 2;
  const totalH = trimH + bleed * 2;

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <Toggle label="منطقة النزيف (Bleed)" checked={showBleed} onChange={(v) => onToggle("bleed", v)} color="bg-rose-500" />
        <Toggle label="منطقة الأمان" checked={showSafe} onChange={(v) => onToggle("safe", v)} color="bg-emerald-500" />
        <Toggle label="علامات القص" checked={showCrop} onChange={(v) => onToggle("crop", v)} color="bg-foreground" />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-6 flex justify-center overflow-auto">
        <div
          className="relative bg-white shadow-md"
          style={{ width: totalW, height: totalH }}
        >
          {/* Bleed area (whole card) */}
          {showBleed && (
            <div className="absolute inset-0 border-2 border-rose-500/70 border-dashed pointer-events-none" />
          )}
          {/* Trim line */}
          <div
            className="absolute border border-foreground/40 pointer-events-none"
            style={{ top: bleed, left: bleed, width: trimW, height: trimH }}
          />
          {/* Safe zone */}
          {showSafe && (
            <div
              className="absolute border-2 border-emerald-500/70 border-dashed pointer-events-none"
              style={{ top: bleed + safe, left: bleed + safe, width: trimW - safe * 2, height: trimH - safe * 2 }}
            />
          )}
          {/* Crop marks (mini) */}
          {showCrop && <CropTicks bleed={bleed} trimW={trimW} trimH={trimH} totalW={totalW} totalH={totalH} />}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
        <Spec label="القص (Trim)" value="85 × 55 mm" />
        <Spec label="مع النزيف" value="91 × 61 mm" />
        <Spec label="منطقة الأمان" value="79 × 49 mm" />
      </div>
    </div>
  );
};

const Toggle = ({ label, checked, onChange, color }: { label: string; checked: boolean; onChange: (v: boolean) => void; color: string }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <Switch checked={checked} onCheckedChange={onChange} />
    <span className={`inline-block w-3 h-3 rounded-sm ${color}`} />
    <Label className="cursor-pointer">{label}</Label>
  </label>
);

const Spec = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded border border-border bg-background/50 px-2 py-1 text-center">
    <div className="text-muted-foreground">{label}</div>
    <div className="font-mono font-semibold text-foreground">{value}</div>
  </div>
);

const CropTicks = ({ bleed, trimW, trimH }: { bleed: number; trimW: number; trimH: number; totalW: number; totalH: number }) => {
  const len = 10;
  const off = 2;
  const ticks: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  // top-left
  ticks.push({ x1: bleed - len, y1: bleed, x2: bleed - off, y2: bleed });
  ticks.push({ x1: bleed, y1: bleed - len, x2: bleed, y2: bleed - off });
  // top-right
  ticks.push({ x1: bleed + trimW + off, y1: bleed, x2: bleed + trimW + len, y2: bleed });
  ticks.push({ x1: bleed + trimW, y1: bleed - len, x2: bleed + trimW, y2: bleed - off });
  // bottom-left
  ticks.push({ x1: bleed - len, y1: bleed + trimH, x2: bleed - off, y2: bleed + trimH });
  ticks.push({ x1: bleed, y1: bleed + trimH + off, x2: bleed, y2: bleed + trimH + len });
  // bottom-right
  ticks.push({ x1: bleed + trimW + off, y1: bleed + trimH, x2: bleed + trimW + len, y2: bleed + trimH });
  ticks.push({ x1: bleed + trimW, y1: bleed + trimH + off, x2: bleed + trimW, y2: bleed + trimH + len });

  return (
    <svg className="absolute inset-0 pointer-events-none overflow-visible" width="100%" height="100%">
      {ticks.map((t, i) => (
        <line key={i} {...t} stroke="hsl(var(--foreground))" strokeWidth="1" />
      ))}
    </svg>
  );
};

export default CardPrintPreview;

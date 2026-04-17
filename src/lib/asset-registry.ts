/**
 * Asset type registry — single source of truth for what each asset type can do.
 * Keep this small and additive; new asset types only need a new entry here.
 */
import type { AssetType } from "@/services/assetService";

export type AssetAction = "edit" | "order" | "download" | "view";
export type ExportFormat = "png" | "svg" | "pdf";

export interface AssetCapabilities {
  /** Can be opened in the SVG editor (/editor/:id). */
  editable: boolean;
  /** Has a front + back side (only true for cards today). */
  hasBackSide: boolean;
  /** Can generate a print-ready PDF and create a print order. */
  printable: boolean;
  /** Formats the user can export/download. */
  exportFormats: ExportFormat[];
  /** Default route for the asset's primary CTA. */
  primaryRoute: "editor" | "viewer";
  /** Action buttons to show on cards in the gallery (in order). */
  actions: AssetAction[];
}

const DESIGN_FULL: AssetCapabilities = {
  editable: true,
  hasBackSide: false,
  printable: false,
  exportFormats: ["png", "pdf", "svg"],
  primaryRoute: "editor",
  actions: ["edit", "download"],
};

const VIEW_ONLY: AssetCapabilities = {
  editable: false,
  hasBackSide: false,
  printable: false,
  exportFormats: ["png"],
  primaryRoute: "viewer",
  actions: ["view", "download"],
};

const DOC_VIEW: AssetCapabilities = {
  editable: false,
  hasBackSide: false,
  printable: false,
  exportFormats: ["pdf"],
  primaryRoute: "viewer",
  actions: ["view", "download"],
};

export const ASSET_CAPABILITIES: Record<AssetType, AssetCapabilities> = {
  // Design — editable
  CRD: { ...DESIGN_FULL, hasBackSide: true, printable: true, actions: ["edit", "order", "download"] },
  TPL: { ...DESIGN_FULL },
  FLY: { ...DESIGN_FULL },
  PST: { ...DESIGN_FULL },
  LOG: { ...DESIGN_FULL, exportFormats: ["png", "svg"] },
  // Media — view + download
  IMG: { ...VIEW_ONLY },
  ART: { ...VIEW_ONLY },
  // Documents — view + download
  DOC: { ...DOC_VIEW },
  PRE: { ...DOC_VIEW },
  LST: { ...DOC_VIEW },
  // Other — basic display
  OTH: { ...VIEW_ONLY, actions: ["view"] },
};

export function getCapabilities(type: AssetType): AssetCapabilities {
  return ASSET_CAPABILITIES[type] ?? VIEW_ONLY;
}

export function getActionLabel(action: AssetAction): string {
  switch (action) {
    case "edit": return "تعديل التصميم";
    case "order": return "اطلب طباعة";
    case "download": return "تحميل";
    case "view": return "عرض";
  }
}

export function getRouteFor(type: AssetType, id: string): string {
  const cap = getCapabilities(type);
  return cap.primaryRoute === "editor" ? `/editor/${id}` : `/viewer/${id}`;
}

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS is_editable boolean NOT NULL DEFAULT true;

-- Backfill: only assets with a linked active SVG template are truly editable.
UPDATE public.assets a
SET is_editable = EXISTS (
  SELECT 1 FROM public.svg_templates t
  WHERE t.asset_id = a.id AND t.is_active = true
);

CREATE INDEX IF NOT EXISTS idx_assets_is_editable ON public.assets(is_editable);
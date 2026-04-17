CREATE TABLE IF NOT EXISTS public.asset_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  file_kind text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_extension text,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  file_size bigint,
  mime_type text,
  folder_path text DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_files_asset ON public.asset_files(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_files_kind ON public.asset_files(file_kind);

ALTER TABLE public.asset_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Asset files publicly readable" ON public.asset_files;
CREATE POLICY "Asset files publicly readable"
  ON public.asset_files FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins manage asset files" ON public.asset_files;
CREATE POLICY "Admins manage asset files"
  ON public.asset_files FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for asset packages
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-packages', 'asset-packages', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read asset packages" ON storage.objects;
CREATE POLICY "Public read asset packages"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'asset-packages');

DROP POLICY IF EXISTS "Admins write asset packages" ON storage.objects;
CREATE POLICY "Admins write asset packages"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'asset-packages' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'asset-packages' AND has_role(auth.uid(), 'admin'::app_role));
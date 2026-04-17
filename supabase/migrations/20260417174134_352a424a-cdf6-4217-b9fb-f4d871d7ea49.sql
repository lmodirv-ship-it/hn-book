-- SVG template system for editable design assets
CREATE TABLE public.svg_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'business',
  -- Front side
  front_svg_url TEXT NOT NULL,
  front_svg_content TEXT,
  -- Back side (optional)
  back_svg_url TEXT,
  back_svg_content TEXT,
  -- Auto-detected fields: [{ key, label, side, defaultValue, type: 'text'|'color' }]
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  preview_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.svg_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SVG templates are publicly readable"
  ON public.svg_templates FOR SELECT USING (true);

CREATE POLICY "Admins can manage svg templates"
  ON public.svg_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_svg_templates_updated_at
  BEFORE UPDATE ON public.svg_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for SVG template files
INSERT INTO storage.buckets (id, name, public)
VALUES ('svg-templates', 'svg-templates', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "SVG templates publicly readable in storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'svg-templates');

CREATE POLICY "Admins can upload svg templates"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'svg-templates' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update svg templates"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'svg-templates' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete svg templates"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'svg-templates' AND has_role(auth.uid(), 'admin'::app_role));

-- Classification data: stores every prediction + correction
CREATE TABLE public.classification_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  aspect_ratio NUMERIC,
  file_type TEXT,
  file_size_kb INTEGER,
  filename_keywords TEXT[] DEFAULT '{}',
  predicted_type TEXT NOT NULL,
  actual_type TEXT,
  confidence NUMERIC DEFAULT 0,
  was_corrected BOOLEAN DEFAULT false,
  corrected_by UUID,
  product_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classification_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Classification data is publicly readable"
  ON public.classification_data FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage classification data"
  ON public.classification_data FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert classification data"
  ON public.classification_data FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Classification model: learned stats per design type
CREATE TABLE public.classification_model (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  design_type TEXT NOT NULL UNIQUE,
  avg_width NUMERIC DEFAULT 0,
  avg_height NUMERIC DEFAULT 0,
  avg_aspect_ratio NUMERIC DEFAULT 0,
  min_width INTEGER DEFAULT 0,
  max_width INTEGER DEFAULT 99999,
  min_height INTEGER DEFAULT 0,
  max_height INTEGER DEFAULT 99999,
  common_keywords TEXT[] DEFAULT '{}',
  sample_count INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy NUMERIC DEFAULT 0,
  avg_file_size_kb NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classification_model ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Classification model is publicly readable"
  ON public.classification_model FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage classification model"
  ON public.classification_model FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage classification model"
  ON public.classification_model FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_classification_data_updated_at
  BEFORE UPDATE ON public.classification_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classification_model_updated_at
  BEFORE UPDATE ON public.classification_model
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

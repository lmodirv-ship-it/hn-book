
CREATE TABLE public.processed_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size_kb INTEGER,
  engines_used TEXT[] DEFAULT '{}',
  extracted_text TEXT,
  structured_data JSONB DEFAULT '{}',
  confidence NUMERIC,
  metadata JSONB DEFAULT '{}',
  custom_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all processed documents"
ON public.processed_documents FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own processed documents"
ON public.processed_documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processed documents"
ON public.processed_documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_processed_documents_updated_at
BEFORE UPDATE ON public.processed_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- Create file type enum
CREATE TYPE public.file_type AS ENUM ('image', 'pdf', 'other');

-- Create product_files table with proper references
CREATE TABLE public.product_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_type file_type NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_size bigint,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by product
CREATE INDEX idx_product_files_product_id ON public.product_files(product_id);
CREATE INDEX idx_product_files_type ON public.product_files(product_id, file_type);

-- Enable RLS
ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;

-- Publicly readable
CREATE POLICY "Product files are publicly readable"
ON public.product_files FOR SELECT
USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage product files"
ON public.product_files FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_product_files_updated_at
BEFORE UPDATE ON public.product_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

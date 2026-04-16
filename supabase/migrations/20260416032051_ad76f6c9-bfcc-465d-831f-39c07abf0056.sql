
-- Add NOT NULL to pdf_url
ALTER TABLE public.products ALTER COLUMN pdf_url SET NOT NULL;

-- Add NOT NULL to image with default
ALTER TABLE public.products ALTER COLUMN image SET DEFAULT '/placeholder.svg';
ALTER TABLE public.products ALTER COLUMN image SET NOT NULL;

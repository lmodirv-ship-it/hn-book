
-- Create book-files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-files', 'book-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for book-files
CREATE POLICY "Book files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-files');

CREATE POLICY "Admins can upload book files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'book-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update book files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'book-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete book files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'book-files' AND public.has_role(auth.uid(), 'admin'));

-- Add pdf_url column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pdf_url text;

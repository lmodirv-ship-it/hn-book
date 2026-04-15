
CREATE POLICY "Anyone can insert processed documents"
ON public.processed_documents FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can view processed documents"
ON public.processed_documents FOR SELECT
TO public
USING (true);

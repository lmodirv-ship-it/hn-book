
-- Manual recommendations table for admin-curated picks
CREATE TABLE public.manual_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'featured' CHECK (type IN ('featured', 'trending', 'recommended')),
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(book_id, type)
);

ALTER TABLE public.manual_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recommendations are publicly readable"
ON public.manual_recommendations FOR SELECT
USING (true);

CREATE POLICY "Admins can manage recommendations"
ON public.manual_recommendations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_manual_recommendations_updated_at
BEFORE UPDATE ON public.manual_recommendations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

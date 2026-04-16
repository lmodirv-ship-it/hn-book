
-- Validation trigger to reject incomplete books
CREATE OR REPLACE FUNCTION public.validate_complete_book()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Book title (name) is required';
  END IF;

  IF NEW.pdf_url IS NULL OR trim(NEW.pdf_url) = '' THEN
    RAISE EXCEPTION 'Book PDF file (pdf_url) is required';
  END IF;

  IF NEW.image IS NULL OR trim(NEW.image) = '' THEN
    RAISE EXCEPTION 'Book cover image (image) is required';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_product_completeness
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_complete_book();

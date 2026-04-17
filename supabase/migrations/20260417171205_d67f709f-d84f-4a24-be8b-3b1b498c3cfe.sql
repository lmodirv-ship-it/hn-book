CREATE OR REPLACE FUNCTION public.validate_complete_book()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Product name is required';
  END IF;

  -- PDF and cover are only mandatory for actual books
  IF lower(coalesce(NEW.category, '')) IN ('كتب', 'books', 'book') THEN
    IF NEW.pdf_url IS NULL OR trim(NEW.pdf_url) = '' THEN
      RAISE EXCEPTION 'Book PDF file (pdf_url) is required';
    END IF;
    IF NEW.image IS NULL OR trim(NEW.image) = '' THEN
      RAISE EXCEPTION 'Book cover image (image) is required';
    END IF;
  END IF;

  -- Ensure non-null defaults for other product types
  IF NEW.pdf_url IS NULL THEN NEW.pdf_url := ''; END IF;
  IF NEW.image IS NULL OR trim(NEW.image) = '' THEN NEW.image := '/placeholder.svg'; END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.asset_category_for_type(_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _type
    WHEN 'CRD' THEN 'DSN'
    WHEN 'TPL' THEN 'DSN'
    WHEN 'LOG' THEN 'DSN'
    WHEN 'FLY' THEN 'DSN'
    WHEN 'PST' THEN 'DSN'
    WHEN 'IMG' THEN 'MED'
    WHEN 'ART' THEN 'MED'
    WHEN 'DOC' THEN 'DOC'
    WHEN 'PRE' THEN 'DOC'
    WHEN 'LST' THEN 'DOC'
    ELSE 'OTH'
  END
$$;
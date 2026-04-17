-- Extend asset category mapping to support mega-zip categories
CREATE OR REPLACE FUNCTION public.asset_category_for_type(_type text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE _type
    WHEN 'CRD' THEN 'DSN'
    WHEN 'TPL' THEN 'DSN'
    WHEN 'LOG' THEN 'DSN'
    WHEN 'FLY' THEN 'DSN'
    WHEN 'PST' THEN 'DSN'
    WHEN 'TSH' THEN 'DSN'
    WHEN 'RES' THEN 'DSN'
    WHEN 'THM' THEN 'DSN'
    WHEN 'ICN' THEN 'DSN'
    WHEN 'IMG' THEN 'MED'
    WHEN 'ART' THEN 'MED'
    WHEN 'VFX' THEN 'MED'
    WHEN 'PRE' THEN 'MED'
    WHEN 'FNT' THEN 'FNT'
    WHEN 'DOC' THEN 'DOC'
    WHEN 'LST' THEN 'DOC'
    ELSE 'OTH'
  END
$function$;

-- Helper: classify a folder name into an asset_type code
CREATE OR REPLACE FUNCTION public.classify_asset_folder(_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _name ~* '(business[-_ ]?card|carte|visiting)' THEN 'CRD'
    WHEN _name ~* '(flyer|leaflet|flayer)' THEN 'FLY'
    WHEN _name ~* '(poster|affiche)' THEN 'PST'
    WHEN _name ~* '(logo|brand|mark)' THEN 'LOG'
    WHEN _name ~* '(t[-_ ]?shirt|tshirt|apparel)' THEN 'TSH'
    WHEN _name ~* '(resume|cv|curriculum)' THEN 'RES'
    WHEN _name ~* '(shopify|theme|website|landing)' THEN 'THM'
    WHEN _name ~* '(icon|vector[-_ ]?icon)' THEN 'ICN'
    WHEN _name ~* '(font|typeface|typography)' THEN 'FNT'
    WHEN _name ~* '(lightroom|preset|lut)' THEN 'PRE'
    WHEN _name ~* '(premiere|video|effect|after[-_ ]?effect|motion)' THEN 'VFX'
    WHEN _name ~* '(stock|royalty|photo|image|picture)' THEN 'IMG'
    WHEN _name ~* '(canva|social|instagram|facebook|story)' THEN 'TPL'
    WHEN _name ~* '(planner|journal|tracker|notebook)' THEN 'TPL'
    WHEN _name ~* '(stationery|wedding|invitation)' THEN 'TPL'
    WHEN _name ~* '(template|design)' THEN 'TPL'
    ELSE 'TPL'
  END
$function$;
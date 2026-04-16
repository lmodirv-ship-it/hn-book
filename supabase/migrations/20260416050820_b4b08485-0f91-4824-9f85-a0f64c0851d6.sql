
ALTER TABLE public.card_templates ADD COLUMN IF NOT EXISTS layout_config jsonb NOT NULL DEFAULT '{
  "width": 900,
  "height": 500,
  "fields": [
    {"key": "name", "label": "الاسم", "x": 50, "y": 180, "fontSize": 28, "fontWeight": "bold", "color": "#ffffff", "maxWidth": 400},
    {"key": "job_title", "label": "الوظيفة", "x": 50, "y": 220, "fontSize": 16, "fontWeight": "normal", "color": "#cccccc", "maxWidth": 400},
    {"key": "company", "label": "الشركة", "x": 50, "y": 260, "fontSize": 14, "fontWeight": "normal", "color": "#cccccc", "maxWidth": 400},
    {"key": "phone", "label": "الهاتف", "x": 50, "y": 320, "fontSize": 14, "fontWeight": "normal", "color": "#ffffff", "maxWidth": 300},
    {"key": "email", "label": "البريد", "x": 50, "y": 350, "fontSize": 14, "fontWeight": "normal", "color": "#ffffff", "maxWidth": 300},
    {"key": "address", "label": "العنوان", "x": 50, "y": 380, "fontSize": 12, "fontWeight": "normal", "color": "#aaaaaa", "maxWidth": 400}
  ]
}'::jsonb;

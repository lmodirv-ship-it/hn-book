
INSERT INTO public.permissions (key, label, description, category) VALUES
  ('export_pdf', 'تصدير PDF', 'يسمح بتحميل البطاقات والتصاميم بصيغة PDF', 'export'),
  ('export_png', 'تصدير PNG', 'يسمح بتحميل البطاقات والتصاميم بصيغة PNG', 'export')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('admin', 'export_pdf'),
  ('admin', 'export_png'),
  ('manager', 'export_pdf'),
  ('manager', 'export_png')
ON CONFLICT DO NOTHING;

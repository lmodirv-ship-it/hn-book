
-- Add category to card_templates
ALTER TABLE public.card_templates ADD COLUMN category TEXT NOT NULL DEFAULT 'business';

-- Add user detail fields to print_orders
ALTER TABLE public.print_orders ADD COLUMN job_title TEXT NOT NULL DEFAULT '';
ALTER TABLE public.print_orders ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE public.print_orders ADD COLUMN company TEXT NOT NULL DEFAULT '';

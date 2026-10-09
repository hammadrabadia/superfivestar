CREATE SEQUENCE public.invoice_number_seq START 1001;
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number int NOT NULL UNIQUE,
  client_name text NOT NULL DEFAULT '',
  client_address text NOT NULL DEFAULT '',
  client_phone text NOT NULL DEFAULT '',
  invoice_date date NOT NULL DEFAULT current_date,
  tax_rate numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0
);
CREATE TABLE public.business_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL,
  address text NOT NULL,
  phones text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.invoices, public.invoice_items, public.business_settings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.invoice_number_seq TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.next_invoice_number() RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT nextval('public.invoice_number_seq')::int $$;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO service_role;
INSERT INTO public.business_settings (id, name, address, phones) VALUES (1, 'UNI BIND PHOTO SERVICE', 'SHOP # 34, 35 HASRAT MOHANI ROAD, KARACHI', '0333-1260016, 0300-9251865, 021-32418864, 021-32424976');
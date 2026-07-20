
-- Enums
DO $$ BEGIN
  CREATE TYPE public.incoterm AS ENUM ('EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rfq_status AS ENUM ('draft','open','closed','awarded','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quotation_status AS ENUM ('submitted','under_negotiation','accepted','rejected','expired','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- RFQs
-- =========================
CREATE TABLE public.rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  product_category TEXT,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'MT',
  target_price NUMERIC,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  incoterm public.incoterm,
  destination_country CHAR(2),
  destination_port TEXT,
  required_certifications TEXT[] NOT NULL DEFAULT '{}',
  deadline DATE,
  status public.rfq_status NOT NULL DEFAULT 'open',
  quotations_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rfqs_status_idx ON public.rfqs(status);
CREATE INDEX rfqs_buyer_idx ON public.rfqs(buyer_id);
CREATE INDEX rfqs_dest_country_idx ON public.rfqs(destination_country);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfqs TO authenticated;
GRANT ALL ON public.rfqs TO service_role;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view open RFQs or own" ON public.rfqs
  FOR SELECT TO authenticated
  USING (status = 'open' OR buyer_id = auth.uid());
CREATE POLICY "Buyer inserts own RFQ" ON public.rfqs
  FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Buyer updates own RFQ" ON public.rfqs
  FOR UPDATE TO authenticated USING (buyer_id = auth.uid()) WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Buyer deletes own RFQ" ON public.rfqs
  FOR DELETE TO authenticated USING (buyer_id = auth.uid());
CREATE TRIGGER rfqs_set_updated BEFORE UPDATE ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Quotations
-- =========================
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  unit_price NUMERIC NOT NULL CHECK (unit_price > 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  quantity NUMERIC NOT NULL,
  incoterm public.incoterm NOT NULL,
  lead_time_days INTEGER,
  validity_date DATE,
  payment_terms TEXT,
  notes TEXT,
  status public.quotation_status NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX quotations_rfq_idx ON public.quotations(rfq_id);
CREATE INDEX quotations_supplier_idx ON public.quotations(supplier_id);
CREATE INDEX quotations_status_idx ON public.quotations(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quotation parties view" ON public.quotations
  FOR SELECT TO authenticated USING (
    supplier_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.buyer_id = auth.uid())
  );
CREATE POLICY "Supplier inserts quotation" ON public.quotations
  FOR INSERT TO authenticated WITH CHECK (supplier_id = auth.uid());
CREATE POLICY "Supplier updates own quotation" ON public.quotations
  FOR UPDATE TO authenticated USING (supplier_id = auth.uid()) WITH CHECK (supplier_id = auth.uid());
CREATE POLICY "Buyer updates status on own RFQ quotations" ON public.quotations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.buyer_id = auth.uid())
  );
CREATE POLICY "Supplier deletes own quotation" ON public.quotations
  FOR DELETE TO authenticated USING (supplier_id = auth.uid());
CREATE TRIGGER quotations_set_updated BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-maintain quotations_count on rfqs
CREATE OR REPLACE FUNCTION public.bump_rfq_quotations_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rfqs SET quotations_count = quotations_count + 1 WHERE id = NEW.rfq_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rfqs SET quotations_count = GREATEST(quotations_count - 1, 0) WHERE id = OLD.rfq_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER quotations_count_trigger
  AFTER INSERT OR DELETE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.bump_rfq_quotations_count();

-- =========================
-- Negotiation
-- =========================
CREATE TABLE public.negotiation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  proposed_price NUMERIC,
  proposed_currency CHAR(3),
  proposed_lead_time_days INTEGER,
  proposed_incoterm public.incoterm,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX neg_msgs_quotation_idx ON public.negotiation_messages(quotation_id);
GRANT SELECT, INSERT, DELETE ON public.negotiation_messages TO authenticated;
GRANT ALL ON public.negotiation_messages TO service_role;
ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Negotiation parties read" ON public.negotiation_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      LEFT JOIN public.rfqs r ON r.id = q.rfq_id
      WHERE q.id = quotation_id
        AND (q.supplier_id = auth.uid() OR r.buyer_id = auth.uid())
    )
  );
CREATE POLICY "Negotiation parties write" ON public.negotiation_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quotations q
      LEFT JOIN public.rfqs r ON r.id = q.rfq_id
      WHERE q.id = quotation_id
        AND (q.supplier_id = auth.uid() OR r.buyer_id = auth.uid())
    )
  );
CREATE POLICY "Sender deletes own message" ON public.negotiation_messages
  FOR DELETE TO authenticated USING (sender_id = auth.uid());

-- =========================
-- Currency rates cache
-- =========================
CREATE TABLE public.currency_rates (
  base CHAR(3) NOT NULL,
  quote CHAR(3) NOT NULL,
  rate NUMERIC NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (base, quote)
);
GRANT SELECT ON public.currency_rates TO anon, authenticated;
GRANT ALL ON public.currency_rates TO service_role;
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Currency rates public read" ON public.currency_rates
  FOR SELECT USING (true);

-- =========================
-- Country regulations
-- =========================
CREATE TABLE public.country_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code CHAR(2) NOT NULL,
  country_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  import_tariff_pct NUMERIC,
  vat_pct NUMERIC,
  restrictions TEXT,
  required_docs TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, product_category)
);
CREATE INDEX country_regs_country_idx ON public.country_regulations(country_code);
CREATE INDEX country_regs_category_idx ON public.country_regulations(product_category);
GRANT SELECT ON public.country_regulations TO anon, authenticated;
GRANT ALL ON public.country_regulations TO service_role;
ALTER TABLE public.country_regulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Regulations public read" ON public.country_regulations
  FOR SELECT USING (true);

INSERT INTO public.country_regulations (country_code, country_name, product_category, import_tariff_pct, vat_pct, restrictions, required_docs, notes) VALUES
('DE','Germany','Fruits & Vegetables',0,7,'EU sanitary/phytosanitary regs; pesticide MRLs strict.',ARRAY['Phytosanitary Certificate','Commercial Invoice','Packing List','Bill of Lading'],'Zero tariff under many EU-Mediterranean partnerships.'),
('NL','Netherlands','Fruits & Vegetables',0,9,'EU MRLs; Rotterdam largest agri gateway.',ARRAY['Phytosanitary Certificate','Commercial Invoice','Packing List','Bill of Lading'],'Fast customs clearance via Portbase.'),
('FR','France','Cereals & Grains',0,5.5,'EU tariff quotas; GMO labelled.',ARRAY['Commercial Invoice','Phytosanitary Certificate','Certificate of Origin'],'GMO must be labelled at retail.'),
('GB','United Kingdom','Fruits & Vegetables',8,0,'Post-Brexit BTOM checks in phases.',ARRAY['Phytosanitary Certificate','Commercial Invoice','Packing List','Health Certificate'],'Border Target Operating Model since 2024.'),
('US','United States','Fruits & Vegetables',4,0,'FDA + USDA APHIS oversight; FSVP required.',ARRAY['FDA Prior Notice','Phytosanitary Certificate','Commercial Invoice','Bill of Lading'],'Facility registration and FSVP importer required.'),
('CA','Canada','Fruits & Vegetables',0,5,'CFIA import declaration required.',ARRAY['Phytosanitary Certificate','CFIA Import Declaration','Commercial Invoice'],'DRC membership recommended.'),
('CN','China','Fruits & Vegetables',10,13,'GACC facility registration required.',ARRAY['GACC Registration','Phytosanitary Certificate','Health Certificate','Commercial Invoice'],'Bilateral protocol required by commodity.'),
('AE','United Arab Emirates','Fruits & Vegetables',0,5,'GCC common external tariff; MOCCAE inspection.',ARRAY['Certificate of Origin','Health Certificate','Halal Certificate','Commercial Invoice'],'Zero tariff on most fresh produce.'),
('SA','Saudi Arabia','Cereals & Grains',5,15,'SFDA approval required.',ARRAY['SFDA Approval','Halal Certificate','Certificate of Origin','Commercial Invoice'],'Ports of Jeddah, Dammam primary entry.'),
('EG','Egypt','Cereals & Grains',2,14,'GOEIC inspection required.',ARRAY['GOEIC Inspection Certificate','Phytosanitary Certificate','Certificate of Origin'],'GASC tenders for wheat.'),
('JP','Japan','Fruits & Vegetables',8,10,'MAFF pest risk analysis; strict MRLs.',ARRAY['Phytosanitary Certificate','Import Notification','Commercial Invoice'],'Pest-free area protocols per commodity.'),
('IN','India','Pulses & Legumes',30,5,'FSSAI + PQIS clearance.',ARRAY['Phytosanitary Certificate','FSSAI Import License','Fumigation Certificate','Commercial Invoice'],'Fumigation with methyl bromide required.'),
('BR','Brazil','Cereals & Grains',10,18,'MAPA phytosanitary controls.',ARRAY['Phytosanitary Certificate','MAPA Import Permit','Certificate of Origin'],'SISCOMEX registration required.'),
('KE','Kenya','Fruits & Vegetables',25,16,'KEPHIS inspection required.',ARRAY['KEPHIS Import Permit','Phytosanitary Certificate','Commercial Invoice'],'EAC common external tariff.'),
('NG','Nigeria','Cereals & Grains',20,7.5,'NAFDAC registration; Form M required.',ARRAY['Form M','SONCAP Certificate','Phytosanitary Certificate','Commercial Invoice'],'FX allocation via CBN.'),
('MA','Morocco','Fruits & Vegetables',2.5,20,'ONSSA approval; EU association agreement.',ARRAY['ONSSA Import Permit','Phytosanitary Certificate','EUR.1 Movement Certificate'],'Duty-free tariff quotas with EU.'),
('TR','Türkiye','Fruits & Vegetables',15,8,'GTHB phytosanitary; strict MRLs.',ARRAY['Phytosanitary Certificate','Control Certificate','Commercial Invoice'],'Customs Union with EU excludes agri.'),
('ES','Spain','Fruits & Vegetables',0,4,'EU MRLs; Algeciras primary port.',ARRAY['Phytosanitary Certificate','Commercial Invoice','Bill of Lading'],'Fast track for Mediterranean origins.'),
('IT','Italy','Cereals & Grains',0,4,'EU tariff quotas.',ARRAY['Commercial Invoice','Phytosanitary Certificate','Certificate of Origin'],'GMO labelling enforced.'),
('AU','Australia','Fruits & Vegetables',5,10,'Strictest biosecurity globally.',ARRAY['Import Permit','Phytosanitary Certificate','Fumigation Certificate','Packing Declaration'],'DAFF Biosecurity review mandatory.');

-- =========================
-- Product certifications
-- =========================
CREATE TABLE public.product_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  cert_type TEXT NOT NULL,
  issuer TEXT,
  issued_date DATE,
  expiry_date DATE,
  document_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX prod_certs_product_idx ON public.product_certifications(product_id);
CREATE INDEX prod_certs_company_idx ON public.product_certifications(company_id);
GRANT SELECT ON public.product_certifications TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_certifications TO authenticated;
GRANT ALL ON public.product_certifications TO service_role;
ALTER TABLE public.product_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Certifications public read" ON public.product_certifications
  FOR SELECT USING (true);
CREATE POLICY "Company owner manages certifications" ON public.product_certifications
  FOR ALL TO authenticated
  USING (
    (company_id IS NOT NULL AND public.owns_company(company_id, auth.uid()))
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    (company_id IS NOT NULL AND public.owns_company(company_id, auth.uid()))
    OR public.is_admin(auth.uid())
  );

-- =========================
-- Trade documents
-- =========================
CREATE TABLE public.trade_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  doc_name TEXT NOT NULL,
  file_url TEXT,
  issued_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX trade_docs_order_idx ON public.trade_documents(order_id);
CREATE INDEX trade_docs_shipment_idx ON public.trade_documents(shipment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_documents TO authenticated;
GRANT ALL ON public.trade_documents TO service_role;
ALTER TABLE public.trade_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order parties view trade docs" ON public.trade_documents
  FOR SELECT TO authenticated USING (
    order_id IS NULL OR public.can_access_order(order_id, auth.uid())
  );
CREATE POLICY "Order parties add trade docs" ON public.trade_documents
  FOR INSERT TO authenticated WITH CHECK (
    uploader_id = auth.uid()
    AND (order_id IS NULL OR public.can_access_order(order_id, auth.uid()))
  );
CREATE POLICY "Uploader updates trade doc" ON public.trade_documents
  FOR UPDATE TO authenticated USING (uploader_id = auth.uid());
CREATE POLICY "Uploader deletes trade doc" ON public.trade_documents
  FOR DELETE TO authenticated USING (uploader_id = auth.uid());

-- =========================
-- Smart contract fields
-- =========================
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS smart_terms JSONB;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_hash TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS auto_execute BOOLEAN NOT NULL DEFAULT false;

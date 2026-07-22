
-- Extend farms table
ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS soil_type text,
  ADD COLUMN IF NOT EXISTS irrigation_type text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text;

DO $$ BEGIN
  ALTER TABLE public.farms
    ADD CONSTRAINT farms_status_check CHECK (status IN ('active','inactive','planning'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_farms_owner ON public.farms(owner_id);
CREATE INDEX IF NOT EXISTS idx_farms_country ON public.farms(country);
CREATE INDEX IF NOT EXISTS idx_farms_status ON public.farms(status);

-- farm_fields
CREATE TABLE IF NOT EXISTS public.farm_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  area_hectares numeric(12,3),
  crop text,
  variety text,
  planting_date date,
  expected_harvest_date date,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','planted','growing','harvested','fallow')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_fields TO authenticated;
GRANT ALL ON public.farm_fields TO service_role;
ALTER TABLE public.farm_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farm_fields read own"
  ON public.farm_fields FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "farm_fields write own"
  ON public.farm_fields FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()))));

CREATE INDEX IF NOT EXISTS idx_farm_fields_farm ON public.farm_fields(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_fields_status ON public.farm_fields(status);
CREATE TRIGGER trg_farm_fields_updated BEFORE UPDATE ON public.farm_fields FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- farm_activities
CREATE TABLE IF NOT EXISTS public.farm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  field_id uuid REFERENCES public.farm_fields(id) ON DELETE SET NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('planting','irrigation','fertilization','pest_control','harvesting','maintenance','inspection','other')),
  title text NOT NULL,
  notes text,
  occurred_at date NOT NULL DEFAULT CURRENT_DATE,
  cost numeric(14,2),
  currency text DEFAULT 'USD',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_activities TO authenticated;
GRANT ALL ON public.farm_activities TO service_role;
ALTER TABLE public.farm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farm_activities read own"
  ON public.farm_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "farm_activities write own"
  ON public.farm_activities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()))));

CREATE INDEX IF NOT EXISTS idx_farm_activities_farm ON public.farm_activities(farm_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_farm_activities_field ON public.farm_activities(field_id);
CREATE TRIGGER trg_farm_activities_updated BEFORE UPDATE ON public.farm_activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- farm_documents
CREATE TABLE IF NOT EXISTS public.farm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'other' CHECK (doc_type IN ('certification','land_title','inspection','license','insurance','contract','other')),
  url text,
  issued_at date,
  expires_at date,
  uploader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_documents TO authenticated;
GRANT ALL ON public.farm_documents TO service_role;
ALTER TABLE public.farm_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farm_documents read own"
  ON public.farm_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "farm_documents write own"
  ON public.farm_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND (f.owner_id = auth.uid() OR public.is_admin(auth.uid()))));

CREATE INDEX IF NOT EXISTS idx_farm_documents_farm ON public.farm_documents(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_documents_expires ON public.farm_documents(expires_at);
CREATE TRIGGER trg_farm_documents_updated BEFORE UPDATE ON public.farm_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Extend profiles with company/tax/website/country columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS date_format text;

-- Ensure updated_at trigger exists on profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Account deletion requests (audited soft-request; admin/service performs final delete)
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "adr_self_read" ON public.account_deletion_requests;
CREATE POLICY "adr_self_read" ON public.account_deletion_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "adr_self_insert" ON public.account_deletion_requests;
CREATE POLICY "adr_self_insert" ON public.account_deletion_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Storage RLS for avatars bucket (created via tool below)
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

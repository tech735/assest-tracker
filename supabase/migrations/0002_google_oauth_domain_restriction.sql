-- Google OAuth support: profile auto-provisioning + kotu.co.in domain restriction.
--
-- `profiles` is created here with IF NOT EXISTS so this is safe to run against a project where
-- it already exists (created manually, outside of tracked migrations) — in that case only the
-- RLS/trigger statements below actually take effect.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'SUPPORT' CHECK (role IN ('SUPPORT', 'WAREHOUSE', 'INVOICING', 'ADMIN')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- Reject any sign-up/sign-in (Google or otherwise) from outside the allowed workspace domain.
-- CHANGE 'kotu.co.in' below if that is not the exact domain you want to allow.
CREATE OR REPLACE FUNCTION public.restrict_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email !~* '^[a-zA-Z0-9._%+-]+@kotu\.co\.in$' THEN
    RAISE EXCEPTION 'Sign-in is restricted to @kotu.co.in accounts.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_email_domain ON auth.users;
CREATE TRIGGER enforce_email_domain
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.restrict_email_domain();

-- Auto-create a profile (default role SUPPORT, least-privileged) the first time someone signs in
-- via Google. An admin can promote the role afterwards. Falls back to a no-op if a profile with
-- the same email already exists under a different id (e.g. one created manually pre-migration) —
-- the app looks that row up by email as a fallback (see src/pages/AuthCallback.tsx).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

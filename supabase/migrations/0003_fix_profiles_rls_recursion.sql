-- Fixes "infinite recursion detected in policy for relation "profiles"" introduced in
-- 0002_google_oauth_domain_restriction.sql. The "Admins can view all profiles" policy queried
-- public.profiles from inside a policy defined ON public.profiles, which Postgres cannot evaluate
-- and errors on for every SELECT — including the simple "view your own profile" policy, since all
-- applicable SELECT policies are evaluated together.
--
-- Fix: move the admin check into a SECURITY DEFINER function. It runs as the function owner
-- (the migration role), which owns public.profiles and is not subject to that table's RLS, so the
-- lookup inside it does not re-trigger the policy it's being used by.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

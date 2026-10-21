-- Resolves the Supabase Security Advisor warnings for functions and RLS policies:
--   0011 function_search_path_mutable
--   0024 rls_policy_always_true
--   0028 anon_security_definer_function_executable
--   0029 authenticated_security_definer_function_executable
-- The pg_net "extension in public" warning is handled separately in 0007.
--
-- IMPORTANT behaviour change: data tables are now only reachable with a real Supabase session
-- (Google sign-in). The anon key alone - which ships in the frontend bundle - can no longer read
-- or write anything. The mock email/password login in src/pages/Auth.tsx never creates a Supabase
-- session, so it will see no data after this runs. Edge functions use the service role key and
-- are unaffected (service_role bypasses RLS).

-- =====================================================
-- 0011: pin search_path on trigger functions
-- =====================================================
-- Only the first three are flagged by the advisor, but the sync_* functions defined in
-- schema.sql have the same problem; they're fixed too if present.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_updated_at_column',
        'sync_location_employees_count',
        'generate_asset_tag',
        'sync_employee_assets_count',
        'sync_location_assets_count',
        'sync_related_names'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
  END LOOP;
END;
$$;

-- =====================================================
-- 0028 / 0029: SECURITY DEFINER functions callable via /rest/v1/rpc
-- =====================================================

-- Trigger functions on auth.users. Postgres only checks EXECUTE when the trigger is created, not
-- when it fires, so revoking from API roles does not affect sign-in. supabase_auth_admin (the role
-- that inserts into auth.users) is granted explicitly because revoking from PUBLIC drops its
-- implicit grant.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_email_domain() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.restrict_email_domain() TO supabase_auth_admin;

-- is_admin() is used inside the profiles RLS policy, so signed-in users must be able to execute
-- it - revoking would break profile reads. Instead move it into a schema PostgREST does not
-- expose, so it can't be called as /rest/v1/rpc/is_admin.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_admin()
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

REVOKE EXECUTE ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- Scoped to authenticated so anon requests never evaluate private.is_admin() (anon has no USAGE
-- on the private schema and would get a permission error instead of an empty result).
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (private.is_admin());

-- Fails (and rolls back this migration) if any other policy created outside tracked migrations
-- still references public.is_admin() - repoint it to private.is_admin() first.
DROP FUNCTION IF EXISTS public.is_admin();

-- =====================================================
-- 0024: replace the "allow everything to everyone" policies
-- =====================================================
-- The old policies applied to every role, including anon. These limit access to signed-in users.
-- Sign-up is already restricted to @kotu.co.in by the restrict_email_domain trigger.
-- They do not add per-role rules (SUPPORT / WAREHOUSE / INVOICING / ADMIN) because the app does
-- not enforce those yet; tighten here when it does.
DROP POLICY IF EXISTS "Allow all operations on locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated users can manage locations" ON public.locations;
CREATE POLICY "Authenticated users can manage locations" ON public.locations
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations on employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON public.employees;
CREATE POLICY "Authenticated users can manage employees" ON public.employees
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations on assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can manage assets" ON public.assets;
CREATE POLICY "Authenticated users can manage assets" ON public.assets
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations on assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can manage assignments" ON public.assignments;
CREATE POLICY "Authenticated users can manage assignments" ON public.assignments
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations on alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can manage alerts" ON public.alerts;
CREATE POLICY "Authenticated users can manage alerts" ON public.alerts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can manage app_settings" ON public.app_settings;
CREATE POLICY "Authenticated users can manage app_settings" ON public.app_settings
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- amc_notifications is only touched by the amc-expiry-check edge function (service role, which
-- bypasses RLS). With RLS enabled and no policy, anon/authenticated get no access at all.
DROP POLICY IF EXISTS "Allow all operations on amc_notifications" ON public.amc_notifications;

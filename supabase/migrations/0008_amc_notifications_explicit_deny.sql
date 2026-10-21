-- Resolves Security Advisor 0008 rls_enabled_no_policy for amc_notifications.
--
-- 0006 left this table with RLS enabled and no policy, which already denies anon/authenticated -
-- only the amc-expiry-check edge function touches it, using the service role (bypasses RLS).
-- This makes that intent an explicit policy instead. Access is unchanged.

DROP POLICY IF EXISTS "No client access to amc_notifications" ON public.amc_notifications;
CREATE POLICY "No client access to amc_notifications" ON public.amc_notifications
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

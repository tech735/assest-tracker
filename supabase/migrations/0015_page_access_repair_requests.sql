-- Page access per role + repair requests from employees. Requires 0009 and 0012.
--
-- 1. Page permissions (Settings → Roles & permissions → Pages) decide which pages each role sees.
--    Admin sees everything. IT Support, Warehouse and Finance get every page by default (an admin
--    can switch pages off). Viewers see only My assets (always on), People and Locations.
-- 2. repair_requests: an employee reports a problem with an asset assigned to them; IT sees it in
--    Maintenance → Requests and in Notifications.

-- =====================================================
-- 1. Page permissions
-- =====================================================
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_check;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_permission_check CHECK (permission IN (
  'assets.edit', 'assets.checkout', 'assets.delete', 'maintenance.manage', 'people.manage',
  'locations.manage', 'audits.run', 'reports.view', 'costs.view', 'settings.manage',
  'dashboard.view', 'assets.view', 'maintenance.view', 'audits.view', 'people.view', 'locations.view', 'settings.view'
));

INSERT INTO public.role_permissions (role, permission)
SELECT r, p
FROM unnest(ARRAY['SUPPORT', 'WAREHOUSE', 'INVOICING']) r,
     unnest(ARRAY['dashboard.view', 'assets.view', 'maintenance.view', 'audits.view', 'people.view', 'locations.view', 'reports.view', 'settings.view']) p
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission) VALUES ('VIEWER', 'people.view'), ('VIEWER', 'locations.view')
ON CONFLICT DO NOTHING;
-- Viewers no longer see Reports by default.
DELETE FROM public.role_permissions WHERE role = 'VIEWER' AND permission = 'reports.view';

-- =====================================================
-- 2. Repair requests
-- =====================================================
CREATE TABLE IF NOT EXISTS public.repair_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  asset_tag TEXT,
  asset_name TEXT,
  issue TEXT NOT NULL CHECK (length(btrim(issue)) BETWEEN 3 AND 2000),
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'declined')),
  it_note TEXT,
  reported_by UUID DEFAULT auth.uid(),
  reporter_name TEXT,
  reporter_email TEXT,
  alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_repair_requests_asset ON public.repair_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON public.repair_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_requests_reporter ON public.repair_requests(reported_by);
CREATE INDEX IF NOT EXISTS idx_repair_requests_alert ON public.repair_requests(alert_id);

ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;

-- IT (maintenance) sees every request; an employee sees their own.
DROP POLICY IF EXISTS "Maintainers and reporters read repair requests" ON public.repair_requests;
CREATE POLICY "Maintainers and reporters read repair requests" ON public.repair_requests
  FOR SELECT TO authenticated
  USING ((SELECT private.has_perm('maintenance.manage')) OR reported_by = (SELECT auth.uid()));

-- Anyone may report a problem with an asset currently assigned to them (IT may report for any asset).
DROP POLICY IF EXISTS "Holders report problems with their assets" ON public.repair_requests;
CREATE POLICY "Holders report problems with their assets" ON public.repair_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    reported_by = (SELECT auth.uid()) AND status = 'open'
    AND (
      (SELECT private.has_perm('maintenance.manage'))
      OR EXISTS (
        SELECT 1 FROM public.assets a JOIN public.employees e ON e.id = a.assigned_to_id
        WHERE a.id = asset_id AND a.status = 'assigned' AND lower(e.email) = (SELECT private.my_email())
      )
    )
  );

DROP POLICY IF EXISTS "Maintainers update repair requests" ON public.repair_requests;
CREATE POLICY "Maintainers update repair requests" ON public.repair_requests
  FOR UPDATE TO authenticated
  USING ((SELECT private.has_perm('maintenance.manage'))) WITH CHECK ((SELECT private.has_perm('maintenance.manage')));
DROP POLICY IF EXISTS "Maintainers delete repair requests" ON public.repair_requests;
CREATE POLICY "Maintainers delete repair requests" ON public.repair_requests
  FOR DELETE TO authenticated USING ((SELECT private.has_perm('maintenance.manage')));

-- Fill reporter / asset details server-side (not trusted from the client) and raise an alert for IT.
CREATE OR REPLACE FUNCTION public.repair_request_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a RECORD;
  who RECORD;
BEGIN
  SELECT asset_tag, name INTO a FROM public.assets WHERE id = NEW.asset_id;
  SELECT full_name, email INTO who FROM public.profiles WHERE id = auth.uid();
  NEW.asset_tag := a.asset_tag;
  NEW.asset_name := a.name;
  NEW.reporter_email := coalesce(who.email, auth.jwt() ->> 'email');
  NEW.reporter_name := coalesce(who.full_name, NEW.reporter_email);
  NEW.issue := btrim(NEW.issue);
  INSERT INTO public.alerts (type, title, description, asset_id, severity)
  VALUES (
    'other',
    'Repair request: ' || coalesce(a.asset_tag, 'asset'),
    coalesce(NEW.reporter_name, 'An employee') || ' reported: ' || left(NEW.issue, 300),
    NEW.asset_id,
    CASE NEW.urgency WHEN 'high' THEN 'high' WHEN 'low' THEN 'low' ELSE 'medium' END
  )
  RETURNING id INTO NEW.alert_id;
  RETURN NEW;
END;
$$;

-- Closing a request resolves its alert; timestamps are kept up to date.
CREATE OR REPLACE FUNCTION public.repair_request_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IN ('resolved', 'declined') AND OLD.status NOT IN ('resolved', 'declined') THEN
    NEW.closed_at := now();
    UPDATE public.alerts SET is_resolved = true WHERE id = NEW.alert_id;
  ELSIF NEW.status IN ('open', 'in_progress') THEN
    NEW.closed_at := NULL;
    UPDATE public.alerts SET is_resolved = false WHERE id = NEW.alert_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.repair_request_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.repair_request_before_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS repair_request_before_insert ON public.repair_requests;
CREATE TRIGGER repair_request_before_insert BEFORE INSERT ON public.repair_requests
  FOR EACH ROW EXECUTE FUNCTION public.repair_request_before_insert();
DROP TRIGGER IF EXISTS repair_request_before_update ON public.repair_requests;
CREATE TRIGGER repair_request_before_update BEFORE UPDATE ON public.repair_requests
  FOR EACH ROW EXECUTE FUNCTION public.repair_request_before_update();

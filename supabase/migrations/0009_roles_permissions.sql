-- Roles & permissions enforced in the database (Settings → Roles & permissions).
--
-- Model: every user has one role in public.profiles.role. public.role_permissions lists which
-- permissions each role has; admins edit it from the app. Row-level security checks
-- private.has_perm('<permission>') on every write. Reads stay open to any signed-in user.
--
-- ADMIN always has every permission (not stored in role_permissions, can't be removed).
-- New Google sign-ins become VIEWER (read-only) until an admin assigns a role.

-- =====================================================
-- Roles
-- =====================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('ADMIN', 'SUPPORT', 'WAREHOUSE', 'INVOICING', 'VIEWER'));
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'VIEWER';

-- Make sure the IT owner can manage roles after this runs.
UPDATE public.profiles SET role = 'ADMIN' WHERE lower(email) = 'tech@kotu.co.in';

-- New sign-ups get VIEWER explicitly (the column default also covers this).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    'VIEWER'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- =====================================================
-- Permission matrix
-- =====================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role TEXT NOT NULL CHECK (role IN ('SUPPORT', 'WAREHOUSE', 'INVOICING', 'VIEWER')),
  permission TEXT NOT NULL CHECK (permission IN (
    'assets.edit', 'assets.checkout', 'assets.delete', 'maintenance.manage', 'people.manage',
    'locations.manage', 'audits.run', 'reports.view', 'costs.view', 'settings.manage'
  )),
  PRIMARY KEY (role, permission)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.role_permissions (role, permission) VALUES
  ('SUPPORT', 'assets.edit'), ('SUPPORT', 'assets.checkout'), ('SUPPORT', 'maintenance.manage'),
  ('SUPPORT', 'people.manage'), ('SUPPORT', 'audits.run'), ('SUPPORT', 'reports.view'),
  ('WAREHOUSE', 'assets.edit'), ('WAREHOUSE', 'assets.checkout'), ('WAREHOUSE', 'maintenance.manage'),
  ('WAREHOUSE', 'locations.manage'), ('WAREHOUSE', 'audits.run'),
  ('INVOICING', 'reports.view'), ('INVOICING', 'costs.view'),
  ('VIEWER', 'reports.view')
ON CONFLICT DO NOTHING;

-- SECURITY DEFINER so it can read profiles/role_permissions regardless of the caller's RLS.
-- Lives in the private schema (not exposed by the API) — see 0006.
CREATE OR REPLACE FUNCTION private.has_perm(p TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND (
        pr.role = 'ADMIN'
        OR EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role = pr.role AND rp.permission = p)
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION private.has_perm(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_perm(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Signed-in users can read role permissions" ON public.role_permissions;
CREATE POLICY "Signed-in users can read role permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Admins add role permissions" ON public.role_permissions;
CREATE POLICY "Admins add role permissions" ON public.role_permissions
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.has_perm('settings.manage')));
DROP POLICY IF EXISTS "Admins remove role permissions" ON public.role_permissions;
CREATE POLICY "Admins remove role permissions" ON public.role_permissions
  FOR DELETE TO authenticated USING ((SELECT private.has_perm('settings.manage')));

-- Admins can change other users' roles (the app's Users list).
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

-- =====================================================
-- Counter / name sync triggers write to OTHER tables (e.g. moving an asset updates
-- locations.assets_count). Run them as the owner so a user who may edit assets but not
-- locations doesn't get blocked. Trigger-only: no API role can call them directly.
-- =====================================================
DO $$
DECLARE fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('sync_employee_assets_count', 'sync_location_assets_count', 'sync_location_employees_count', 'sync_related_names')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER', fn);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END;
$$;

-- =====================================================
-- Table policies: read for everyone signed in, write by permission
-- =====================================================
-- Helper to (re)create the standard read policy.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['assets', 'assignments', 'employees', 'locations', 'alerts', 'app_settings'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can manage %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Signed-in users can read %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Signed-in users can read %s" ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL)', t, t);
  END LOOP;
END;
$$;

-- assets: create/edit/check-out/repair all update the row; deleting needs its own permission.
DROP POLICY IF EXISTS "Asset writers can insert assets" ON public.assets;
CREATE POLICY "Asset writers can insert assets" ON public.assets FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.has_perm('assets.edit')));
DROP POLICY IF EXISTS "Asset writers can update assets" ON public.assets;
CREATE POLICY "Asset writers can update assets" ON public.assets FOR UPDATE TO authenticated
  USING ((SELECT private.has_perm('assets.edit')) OR (SELECT private.has_perm('assets.checkout')) OR (SELECT private.has_perm('maintenance.manage')))
  WITH CHECK ((SELECT private.has_perm('assets.edit')) OR (SELECT private.has_perm('assets.checkout')) OR (SELECT private.has_perm('maintenance.manage')));
DROP POLICY IF EXISTS "Asset deleters can delete assets" ON public.assets;
CREATE POLICY "Asset deleters can delete assets" ON public.assets FOR DELETE TO authenticated
  USING ((SELECT private.has_perm('assets.delete')));

-- assignments (the event log): check-outs/returns, repairs, lost/found.
DROP POLICY IF EXISTS "Asset writers can log events" ON public.assignments;
CREATE POLICY "Asset writers can log events" ON public.assignments FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.has_perm('assets.checkout')) OR (SELECT private.has_perm('maintenance.manage')) OR (SELECT private.has_perm('assets.edit')));
DROP POLICY IF EXISTS "Asset writers can update events" ON public.assignments;
CREATE POLICY "Asset writers can update events" ON public.assignments FOR UPDATE TO authenticated
  USING ((SELECT private.has_perm('assets.checkout')) OR (SELECT private.has_perm('assets.edit')))
  WITH CHECK ((SELECT private.has_perm('assets.checkout')) OR (SELECT private.has_perm('assets.edit')));
DROP POLICY IF EXISTS "Asset deleters can delete events" ON public.assignments;
CREATE POLICY "Asset deleters can delete events" ON public.assignments FOR DELETE TO authenticated
  USING ((SELECT private.has_perm('assets.delete')));

-- employees, locations, alerts, settings: one permission (or set) gates insert/update/delete.
-- Separate per-command policies (not FOR ALL) so SELECT has exactly one policy per role.
DO $$
DECLARE
  spec RECORD;
  cmd TEXT;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('employees', '(SELECT private.has_perm(''people.manage''))'),
      ('locations', '(SELECT private.has_perm(''locations.manage''))'),
      ('alerts', '((SELECT private.has_perm(''assets.edit'')) OR (SELECT private.has_perm(''maintenance.manage'')) OR (SELECT private.has_perm(''assets.checkout'')))'),
      ('app_settings', '(SELECT private.has_perm(''settings.manage''))')
    ) AS v(tbl, expr)
  LOOP
    FOREACH cmd IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Permitted users can ' || lower(cmd) || ' ' || spec.tbl, spec.tbl);
      IF cmd = 'INSERT' THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', 'Permitted users can insert ' || spec.tbl, spec.tbl, spec.expr);
      ELSIF cmd = 'UPDATE' THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', 'Permitted users can update ' || spec.tbl, spec.tbl, spec.expr, spec.expr);
      ELSE
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', 'Permitted users can delete ' || spec.tbl, spec.tbl, spec.expr);
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- =====================================================
-- profiles: one SELECT policy instead of two overlapping ones (Performance Advisor
-- "multiple permissive policies"), with auth.uid() wrapped so it's evaluated once per query.
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users see own profile, admins see all" ON public.profiles;
CREATE POLICY "Users see own profile, admins see all" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT private.is_admin()));

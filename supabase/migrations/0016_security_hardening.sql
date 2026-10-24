-- Security hardening from the 24 Oct 2026 audit (security-reports/audit-2026-10-24.md).
-- Requires 0009–0015. Safe to re-run.
--
-- H1  Reads follow page permissions instead of "any signed-in user"; costs move to asset_costs.
-- M1  Uploaded files readable only by staff, or the employee holding the asset; MIME allow-list.
-- M3  email_log for throttling the email Edge Functions.
-- M7  Notes: only staff or the asset's holder may add them; author name is set server-side.
-- L1  Signatures must be a PNG data URL of sane size.
-- L7  Field-level limits on asset updates; closed history rows are append-only.

-- =====================================================
-- Helpers
-- =====================================================
-- Employee record(s) of the signed-in user (matched by email). SECURITY DEFINER so policies can use
-- it without recursing through employees' own RLS.
CREATE OR REPLACE FUNCTION private.my_employee_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT id FROM public.employees WHERE lower(email) = (SELECT private.my_email()) $$;
REVOKE EXECUTE ON FUNCTION private.my_employee_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.my_employee_ids() TO authenticated;

-- =====================================================
-- H1: costs out of assets into their own table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.asset_costs (
  asset_id UUID PRIMARY KEY REFERENCES public.assets(id) ON DELETE CASCADE,
  purchase_cost NUMERIC(12, 2),
  repair_cost NUMERIC(12, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'purchase_cost') THEN
    INSERT INTO public.asset_costs (asset_id, purchase_cost, repair_cost)
    SELECT id, purchase_cost, repair_cost FROM public.assets
    ON CONFLICT (asset_id) DO UPDATE SET purchase_cost = EXCLUDED.purchase_cost, repair_cost = EXCLUDED.repair_cost;
    ALTER TABLE public.assets DROP COLUMN purchase_cost, DROP COLUMN repair_cost;
  END IF;
END;
$$;

ALTER TABLE public.asset_costs ENABLE ROW LEVEL SECURITY;
-- Readable with "See costs", or by the people who enter costs (asset editors, maintenance).
DROP POLICY IF EXISTS "Cost viewers and editors read asset costs" ON public.asset_costs;
CREATE POLICY "Cost viewers and editors read asset costs" ON public.asset_costs FOR SELECT TO authenticated
  USING ((SELECT private.has_perm('costs.view')) OR (SELECT private.has_perm('assets.edit')) OR (SELECT private.has_perm('maintenance.manage')));
DROP POLICY IF EXISTS "Editors add asset costs" ON public.asset_costs;
CREATE POLICY "Editors add asset costs" ON public.asset_costs FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.has_perm('assets.edit')) OR (SELECT private.has_perm('maintenance.manage')));
DROP POLICY IF EXISTS "Editors update asset costs" ON public.asset_costs;
CREATE POLICY "Editors update asset costs" ON public.asset_costs FOR UPDATE TO authenticated
  USING ((SELECT private.has_perm('assets.edit')) OR (SELECT private.has_perm('maintenance.manage')))
  WITH CHECK ((SELECT private.has_perm('assets.edit')) OR (SELECT private.has_perm('maintenance.manage')));
DROP POLICY IF EXISTS "Asset deleters remove asset costs" ON public.asset_costs;
CREATE POLICY "Asset deleters remove asset costs" ON public.asset_costs FOR DELETE TO authenticated
  USING ((SELECT private.has_perm('assets.delete')));

-- =====================================================
-- H1: reads follow page permissions
-- =====================================================
DROP POLICY IF EXISTS "Signed-in users can read assets" ON public.assets;
DROP POLICY IF EXISTS "Staff or holder can read assets" ON public.assets;
CREATE POLICY "Staff or holder can read assets" ON public.assets FOR SELECT TO authenticated
  USING ((SELECT private.has_perm('assets.view')) OR assigned_to_id IN (SELECT private.my_employee_ids()));

DROP POLICY IF EXISTS "Signed-in users can read assignments" ON public.assignments;
DROP POLICY IF EXISTS "Staff or the employee can read assignments" ON public.assignments;
CREATE POLICY "Staff or the employee can read assignments" ON public.assignments FOR SELECT TO authenticated
  USING ((SELECT private.has_perm('assets.view')) OR employee_id IN (SELECT private.my_employee_ids()));

DROP POLICY IF EXISTS "Signed-in users can read employees" ON public.employees;
DROP POLICY IF EXISTS "Staff or self can read employees" ON public.employees;
CREATE POLICY "Staff or self can read employees" ON public.employees FOR SELECT TO authenticated
  USING (
    (SELECT private.has_perm('people.view')) OR (SELECT private.has_perm('assets.view')) OR (SELECT private.has_perm('assets.checkout'))
    OR lower(email) = (SELECT private.my_email())
  );

DROP POLICY IF EXISTS "Signed-in users can read locations" ON public.locations;
DROP POLICY IF EXISTS "Staff can read locations" ON public.locations;
CREATE POLICY "Staff can read locations" ON public.locations FOR SELECT TO authenticated
  USING (
    (SELECT private.has_perm('locations.view')) OR (SELECT private.has_perm('assets.view'))
    OR (SELECT private.has_perm('people.view')) OR (SELECT private.has_perm('locations.manage'))
  );

DROP POLICY IF EXISTS "Signed-in users can read alerts" ON public.alerts;
DROP POLICY IF EXISTS "Dashboard users can read alerts" ON public.alerts;
CREATE POLICY "Dashboard users can read alerts" ON public.alerts FOR SELECT TO authenticated
  USING ((SELECT private.has_perm('dashboard.view')) OR (SELECT private.has_perm('maintenance.view')));

DROP POLICY IF EXISTS "Signed-in users can read notes" ON public.asset_notes;
DROP POLICY IF EXISTS "Staff or holder can read notes" ON public.asset_notes;
CREATE POLICY "Staff or holder can read notes" ON public.asset_notes FOR SELECT TO authenticated
  USING ((SELECT private.has_perm('assets.view')) OR asset_id IN (SELECT id FROM public.assets WHERE assigned_to_id IN (SELECT private.my_employee_ids())));

DROP POLICY IF EXISTS "Signed-in users can read file records" ON public.asset_files;
DROP POLICY IF EXISTS "Staff or holder can read file records" ON public.asset_files;
CREATE POLICY "Staff or holder can read file records" ON public.asset_files FOR SELECT TO authenticated
  USING ((SELECT private.has_perm('assets.view')) OR asset_id IN (SELECT id FROM public.assets WHERE assigned_to_id IN (SELECT private.my_employee_ids())));

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['audits', 'audit_items', 'audit_scans'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Signed-in users can read ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Audit staff can read ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT private.has_perm(''audits.view'')) OR (SELECT private.has_perm(''audits.run'')))', 'Audit staff can read ' || t, t);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Signed-in users can read service_contracts" ON public.service_contracts;
DROP POLICY IF EXISTS "Staff can read service_contracts" ON public.service_contracts;
CREATE POLICY "Staff can read service_contracts" ON public.service_contracts FOR SELECT TO authenticated
  USING ((SELECT private.has_perm('maintenance.view')) OR (SELECT private.has_perm('assets.view')));

-- =====================================================
-- M1: uploaded files
-- =====================================================
DROP POLICY IF EXISTS "Signed-in users can read asset files" ON storage.objects;
DROP POLICY IF EXISTS "Staff or holder can read asset files" ON storage.objects;
CREATE POLICY "Staff or holder can read asset files" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'asset-files' AND (
      (SELECT private.has_perm('assets.view')) OR (SELECT private.has_perm('maintenance.view'))
      -- files are stored under <asset_id>/…; contract documents under contracts/… stay staff-only
      OR (storage.foldername(name))[1] IN (SELECT id::text FROM public.assets WHERE assigned_to_id IN (SELECT private.my_employee_ids()))
    )
  );

UPDATE storage.buckets SET allowed_mime_types = ARRAY[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'text/plain'
] WHERE id = 'asset-files';

-- =====================================================
-- M3: email throttling log (written only by Edge Functions with the service role)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fn TEXT NOT NULL,
  target TEXT NOT NULL,
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_log_lookup ON public.email_log (fn, target, created_at DESC);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct access to email_log" ON public.email_log;
CREATE POLICY "No direct access to email_log" ON public.email_log FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- =====================================================
-- M7: notes
-- =====================================================
DROP POLICY IF EXISTS "Users add their own notes" ON public.asset_notes;
DROP POLICY IF EXISTS "Staff or holder add notes" ON public.asset_notes;
CREATE POLICY "Staff or holder add notes" ON public.asset_notes FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND ((SELECT private.has_perm('assets.view')) OR asset_id IN (SELECT id FROM public.assets WHERE assigned_to_id IN (SELECT private.my_employee_ids())))
  );

CREATE OR REPLACE FUNCTION public.asset_note_set_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- The name shown on a note comes from the author's profile, never from the client.
  SELECT coalesce(nullif(trim(full_name), ''), email) INTO NEW.author_name FROM public.profiles WHERE id = auth.uid();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.asset_note_set_author() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS asset_note_set_author ON public.asset_notes;
CREATE TRIGGER asset_note_set_author BEFORE INSERT ON public.asset_notes FOR EACH ROW EXECUTE FUNCTION public.asset_note_set_author();

-- =====================================================
-- L1: signatures must be a PNG data URL
-- =====================================================
CREATE OR REPLACE FUNCTION public.guard_handover_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_signer BOOLEAN := lower(OLD.employee_email) = private.my_email();
  sig_name TEXT := NEW.signer_name;
  sig TEXT := NEW.signature;
BEGIN
  IF OLD.status = 'signed' AND NEW.status <> 'void' THEN
    RAISE EXCEPTION 'This document is already signed';
  END IF;

  IF NEW.status = 'signed' AND OLD.status <> 'signed' THEN
    IF NOT is_signer THEN
      RAISE EXCEPTION 'Only % can sign this document', OLD.employee_name;
    END IF;
    IF coalesce(trim(sig_name), '') = '' OR coalesce(sig, '') = '' THEN
      RAISE EXCEPTION 'A typed name and a signature are required';
    END IF;
    IF length(sig_name) > 200 OR length(sig) > 400000 OR sig !~ '^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$' THEN
      RAISE EXCEPTION 'The signature must be a drawn signature image';
    END IF;
    -- Keep everything as issued; only record the signature.
    NEW := OLD;
    NEW.status := 'signed';
    NEW.signed_at := now();
    NEW.signer_name := trim(sig_name);
    NEW.signature := sig;
    RETURN NEW;
  END IF;

  IF NOT private.has_perm('assets.checkout') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  -- Staff may only void (or edit notes on) an unsigned document.
  NEW.items := OLD.items;
  NEW.employee_email := OLD.employee_email;
  NEW.employee_name := OLD.employee_name;
  NEW.signed_at := OLD.signed_at;
  NEW.signer_name := OLD.signer_name;
  NEW.signature := OLD.signature;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_handover_update() FROM PUBLIC, anon, authenticated;

-- =====================================================
-- L7: field-level limits
-- =====================================================
-- Without "Create, edit & import assets", an update may only touch the fields that check-out,
-- check-in, repairs, loss and AMC renewals change. Internal triggers (run as the table owner) are exempt.
CREATE OR REPLACE FUNCTION public.guard_asset_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR (SELECT private.has_perm('assets.edit')) THEN
    RETURN NEW;
  END IF;
  IF NEW.asset_tag IS DISTINCT FROM OLD.asset_tag OR NEW.serial_number IS DISTINCT FROM OLD.serial_number
     OR NEW.name IS DISTINCT FROM OLD.name OR NEW.brand IS DISTINCT FROM OLD.brand OR NEW.model IS DISTINCT FROM OLD.model
     OR NEW.category IS DISTINCT FROM OLD.category OR NEW.purchase_date IS DISTINCT FROM OLD.purchase_date
     OR NEW.vendor IS DISTINCT FROM OLD.vendor OR NEW.warranty_start IS DISTINCT FROM OLD.warranty_start
     OR NEW.warranty_end IS DISTINCT FROM OLD.warranty_end OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only users who can edit assets may change asset details';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_asset_update ON public.assets;
CREATE TRIGGER guard_asset_update BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.guard_asset_update();

-- History rows: only the open check-out may be closed (return details); closed rows are read-only
-- except for admins.
CREATE OR REPLACE FUNCTION public.guard_assignment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR (SELECT private.is_admin()) THEN
    RETURN NEW;
  END IF;
  IF OLD.return_date IS NOT NULL THEN
    RAISE EXCEPTION 'Closed history entries cannot be changed';
  END IF;
  IF NEW.asset_id IS DISTINCT FROM OLD.asset_id OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.asset_tag IS DISTINCT FROM OLD.asset_tag OR NEW.asset_name IS DISTINCT FROM OLD.asset_name
     OR NEW.employee_name IS DISTINCT FROM OLD.employee_name OR NEW.assigned_date IS DISTINCT FROM OLD.assigned_date
     OR NEW.handed_over_by IS DISTINCT FROM OLD.handed_over_by OR NEW.bundle_id IS DISTINCT FROM OLD.bundle_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only return details can be added to a history entry';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_assignment_update ON public.assignments;
CREATE TRIGGER guard_assignment_update BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.guard_assignment_update();

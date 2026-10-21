-- Audits / stock-takes (Audits page). Requires 0009 (private.has_perm).
--
-- An audit snapshots the assets expected at a location when it starts (audit_items), then
-- records every scan (audit_scans). Missing = expected items with no scan.

CREATE TABLE IF NOT EXISTS public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  location_name TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'closed')),
  due_date DATE,
  notes TEXT,
  expected_count INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5, 2),
  started_by UUID DEFAULT auth.uid(),
  started_by_name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.audit_items (
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  asset_tag TEXT,
  asset_name TEXT,
  serial_number TEXT,
  PRIMARY KEY (audit_id, asset_id)
);

CREATE TABLE IF NOT EXISTS public.audit_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('found', 'misplaced', 'unexpected')),
  scanned_by UUID DEFAULT auth.uid(),
  scanned_by_name TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audit_id, code)
);
CREATE INDEX IF NOT EXISTS idx_audit_scans_audit ON public.audit_scans(audit_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_scans_asset ON public.audit_scans(asset_id);
CREATE INDEX IF NOT EXISTS idx_audit_items_asset ON public.audit_items(asset_id);
CREATE INDEX IF NOT EXISTS idx_audits_location ON public.audits(location_id);

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_scans ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT; cmd TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['audits', 'audit_items', 'audit_scans'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Signed-in users can read ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL)', 'Signed-in users can read ' || t, t);
    FOREACH cmd IN ARRAY ARRAY['insert', 'update', 'delete'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Auditors can ' || cmd || ' ' || t, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT private.has_perm(''audits.run'')))', 'Auditors can insert ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT private.has_perm(''audits.run''))) WITH CHECK ((SELECT private.has_perm(''audits.run'')))', 'Auditors can update ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT private.has_perm(''audits.run'')))', 'Auditors can delete ' || t, t);
  END LOOP;
END;
$$;

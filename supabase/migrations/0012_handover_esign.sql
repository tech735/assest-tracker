-- E-signed handover / return forms. Requires 0009 (private.has_perm).
--
-- Signatures are personal data: only IT staff (check-out / people permissions) and the employee
-- themselves can read these documents.
--
-- IT creates a document when checking assets out (or in). The employee opens /sign/<id> while
-- signed in with their own @kotu.co.in Google account and signs. Rules enforced here:
--   * only the employee named on the document (matched by email) can sign it;
--   * signing can only add the signature — items, names and dates can't be altered;
--   * IT can void a document but can never mark one as signed on the employee's behalf.

CREATE TABLE IF NOT EXISTS public.handover_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 1001),
  kind TEXT NOT NULL DEFAULT 'handover' CHECK (kind IN ('handover', 'return')),
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  location_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  handed_over_by TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'void')),
  created_by UUID DEFAULT auth.uid(),
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_at TIMESTAMPTZ,
  signer_name TEXT,
  signature TEXT CHECK (signature IS NULL OR char_length(signature) <= 300000)
);
CREATE INDEX IF NOT EXISTS idx_handover_employee ON public.handover_documents(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handover_email ON public.handover_documents(lower(employee_email));
ALTER TABLE public.handover_documents ENABLE ROW LEVEL SECURITY;

-- Signed-in user's email from their JWT
CREATE OR REPLACE FUNCTION private.my_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT lower(coalesce(auth.jwt() ->> 'email', '')) $$;
REVOKE EXECUTE ON FUNCTION private.my_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.my_email() TO authenticated;

DROP POLICY IF EXISTS "Staff and the employee can read handover documents" ON public.handover_documents;
CREATE POLICY "Staff and the employee can read handover documents" ON public.handover_documents
  FOR SELECT TO authenticated
  USING (
    (SELECT private.has_perm('assets.checkout')) OR (SELECT private.has_perm('people.manage'))
    OR lower(employee_email) = (SELECT private.my_email())
  );
DROP POLICY IF EXISTS "Staff create handover documents" ON public.handover_documents;
CREATE POLICY "Staff create handover documents" ON public.handover_documents
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.has_perm('assets.checkout')) AND status = 'pending');
DROP POLICY IF EXISTS "Staff void or employee signs handover documents" ON public.handover_documents;
CREATE POLICY "Staff void or employee signs handover documents" ON public.handover_documents
  FOR UPDATE TO authenticated
  USING ((SELECT private.has_perm('assets.checkout')) OR (status = 'pending' AND lower(employee_email) = (SELECT private.my_email())))
  WITH CHECK ((SELECT private.has_perm('assets.checkout')) OR lower(employee_email) = (SELECT private.my_email()));

-- Column-level rules RLS can't express. Trigger-only, runs as owner.
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

DROP TRIGGER IF EXISTS tr_guard_handover_update ON public.handover_documents;
CREATE TRIGGER tr_guard_handover_update
  BEFORE UPDATE ON public.handover_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_handover_update();

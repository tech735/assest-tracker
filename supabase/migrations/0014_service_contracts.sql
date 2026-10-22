-- Service contracts (AMC and vendor warranties) as records of their own: vendor, invoice / contract
-- number, coverage terms, period, cost and the invoice PDF. Assets link to the contract covering them;
-- linking also sets the asset's amc_* / warranty_* dates so the AMC reminder emails keep working.
-- Requires 0009 (private.has_perm) and 0010 (asset-files bucket).

CREATE TABLE IF NOT EXISTS public.service_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'amc' CHECK (kind IN ('amc', 'warranty')),
  vendor TEXT NOT NULL,
  reference TEXT,                -- invoice or contract number
  coverage TEXT NOT NULL DEFAULT 'non_comprehensive' CHECK (coverage IN ('comprehensive', 'non_comprehensive')),
  category TEXT,                 -- asset type it is for, e.g. Laptops, Printers
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  units INTEGER CHECK (units IS NULL OR units >= 0),
  rate NUMERIC(12, 2),           -- per unit, before tax
  tax_percent NUMERIC(5, 2),
  total_amount NUMERIC(12, 2),   -- including tax
  currency TEXT NOT NULL DEFAULT 'INR',
  covers TEXT,
  excludes TEXT,
  support_contact TEXT,
  notes TEXT,
  document_path TEXT,            -- invoice / contract PDF in the asset-files bucket
  document_name TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS amc_contract_id UUID REFERENCES public.service_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warranty_contract_id UUID REFERENCES public.service_contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_assets_amc_contract ON public.assets(amc_contract_id);
CREATE INDEX IF NOT EXISTS idx_assets_warranty_contract ON public.assets(warranty_contract_id);

ALTER TABLE public.service_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can read service_contracts" ON public.service_contracts;
CREATE POLICY "Signed-in users can read service_contracts" ON public.service_contracts
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Maintainers can insert service_contracts" ON public.service_contracts;
CREATE POLICY "Maintainers can insert service_contracts" ON public.service_contracts
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.has_perm('maintenance.manage')));
DROP POLICY IF EXISTS "Maintainers can update service_contracts" ON public.service_contracts;
CREATE POLICY "Maintainers can update service_contracts" ON public.service_contracts
  FOR UPDATE TO authenticated
  USING ((SELECT private.has_perm('maintenance.manage'))) WITH CHECK ((SELECT private.has_perm('maintenance.manage')));
DROP POLICY IF EXISTS "Maintainers can delete service_contracts" ON public.service_contracts;
CREATE POLICY "Maintainers can delete service_contracts" ON public.service_contracts
  FOR DELETE TO authenticated USING ((SELECT private.has_perm('maintenance.manage')));

DROP TRIGGER IF EXISTS update_service_contracts_updated_at ON public.service_contracts;
CREATE TRIGGER update_service_contracts_updated_at BEFORE UPDATE ON public.service_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Laptop AMC bought from Pratham Info Solutions (invoice PIS/2026-27/062, 12-Aug-2026). Pick the
-- 15 laptops it covers from the contract's "Add assets" in Maintenance → Contracts.
INSERT INTO public.service_contracts
  (kind, vendor, reference, coverage, category, start_date, end_date, units, rate, tax_percent, total_amount,
   covers, excludes, support_contact, notes)
SELECT 'amc', 'Pratham Info Solutions', 'PIS/2026-27/062', 'non_comprehensive', 'Laptops',
  DATE '2026-08-12', DATE '2027-08-11', 15, 1800, 18, 31860,
  'Service and labour for hardware faults and repairs (non-comprehensive AMC).',
  'Replacement parts are billed separately.',
  'Pratham Info Solutions · +91 98998 95789 · prathaminfosolutions@gmail.com',
  'Invoice dated 12-Aug-2026 (₹27,000 + 18% IGST ₹4,860). Ordered by mail confirmation on 06-Aug-2026 (Mahesh Chennamshetty). Paid 100% in advance.'
WHERE NOT EXISTS (SELECT 1 FROM public.service_contracts WHERE reference = 'PIS/2026-27/062');

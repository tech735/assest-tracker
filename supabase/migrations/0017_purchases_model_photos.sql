-- Purchase invoices (one per delivery, with the tax invoice PDF), product photos shared by every
-- unit of a model, and blank serials for items that have none.
-- Requires 0009 (private.has_perm), 0010 (asset-files bucket) and 0016 (guard_asset_update).

-- =====================================================
-- Purchase invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor TEXT NOT NULL CHECK (length(btrim(vendor)) BETWEEN 1 AND 200),
  invoice_number TEXT CHECK (invoice_number IS NULL OR length(invoice_number) <= 100),
  invoice_date DATE NOT NULL,
  subtotal NUMERIC(12, 2) CHECK (subtotal IS NULL OR subtotal >= 0),      -- before tax
  tax_amount NUMERIC(12, 2) CHECK (tax_amount IS NULL OR tax_amount >= 0),
  total_amount NUMERIC(12, 2) CHECK (total_amount IS NULL OR total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 2000),
  document_path TEXT,            -- tax invoice PDF in the asset-files bucket, under invoices/<id>/
  document_name TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- The same vendor invoice can't be entered twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_invoices_vendor_number
  ON public.purchase_invoices (lower(btrim(vendor)), lower(btrim(invoice_number))) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON public.purchase_invoices (invoice_date DESC);

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS purchase_invoice_id UUID REFERENCES public.purchase_invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_assets_purchase_invoice ON public.assets(purchase_invoice_id);

ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
-- Amounts are purchase costs: the same people who see asset costs (finance, and those who enter assets).
DROP POLICY IF EXISTS "Cost viewers and editors read purchase invoices" ON public.purchase_invoices;
CREATE POLICY "Cost viewers and editors read purchase invoices" ON public.purchase_invoices
  FOR SELECT TO authenticated USING ((SELECT private.has_perm('costs.view')) OR (SELECT private.has_perm('assets.edit')));
DROP POLICY IF EXISTS "Asset editors add purchase invoices" ON public.purchase_invoices;
CREATE POLICY "Asset editors add purchase invoices" ON public.purchase_invoices
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.has_perm('assets.edit')));
DROP POLICY IF EXISTS "Asset editors update purchase invoices" ON public.purchase_invoices;
CREATE POLICY "Asset editors update purchase invoices" ON public.purchase_invoices
  FOR UPDATE TO authenticated
  USING ((SELECT private.has_perm('assets.edit'))) WITH CHECK ((SELECT private.has_perm('assets.edit')));
DROP POLICY IF EXISTS "Asset deleters remove purchase invoices" ON public.purchase_invoices;
CREATE POLICY "Asset deleters remove purchase invoices" ON public.purchase_invoices
  FOR DELETE TO authenticated USING ((SELECT private.has_perm('assets.delete')));

DROP TRIGGER IF EXISTS update_purchase_invoices_updated_at ON public.purchase_invoices;
CREATE TRIGGER update_purchase_invoices_updated_at BEFORE UPDATE ON public.purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Linking an asset to an invoice is an asset detail like vendor and purchase date (0016, L7).
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
     OR NEW.purchase_invoice_id IS DISTINCT FROM OLD.purchase_invoice_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only users who can edit assets may change asset details';
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- Items without a serial (bags, mice…): the serial defaults to the asset tag
-- =====================================================
-- Runs after tr_generate_asset_tag (same-event triggers fire in name order), so the tag is set.
CREATE OR REPLACE FUNCTION public.serial_defaults_to_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.serial_number IS NULL OR btrim(NEW.serial_number) = '' THEN
    NEW.serial_number := NEW.asset_tag;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.serial_defaults_to_tag() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS tr_serial_defaults_to_tag ON public.assets;
CREATE TRIGGER tr_serial_defaults_to_tag BEFORE INSERT ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.serial_defaults_to_tag();

-- =====================================================
-- Product photos: one per brand + model, shown for every unit
-- =====================================================
CREATE TABLE IF NOT EXISTS public.model_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL DEFAULT '' CHECK (length(brand) <= 100),
  model TEXT NOT NULL CHECK (length(btrim(model)) BETWEEN 1 AND 150),
  -- "Dell  Latitude 5440" and "dell latitude 5440" are the same model.
  model_key TEXT GENERATED ALWAYS AS (lower(btrim(regexp_replace(brand || ' ' || model, '\s+', ' ', 'g')))) STORED,
  photo_path TEXT NOT NULL,
  updated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_model_photos_key ON public.model_photos (model_key);

ALTER TABLE public.model_photos ENABLE ROW LEVEL SECURITY;
-- Product pictures aren't sensitive: everyone signed in sees them (My assets cards included).
DROP POLICY IF EXISTS "Signed-in users read model photos" ON public.model_photos;
CREATE POLICY "Signed-in users read model photos" ON public.model_photos
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Asset editors add model photos" ON public.model_photos;
CREATE POLICY "Asset editors add model photos" ON public.model_photos
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.has_perm('assets.edit')));
DROP POLICY IF EXISTS "Asset editors update model photos" ON public.model_photos;
CREATE POLICY "Asset editors update model photos" ON public.model_photos
  FOR UPDATE TO authenticated
  USING ((SELECT private.has_perm('assets.edit'))) WITH CHECK ((SELECT private.has_perm('assets.edit')));
DROP POLICY IF EXISTS "Asset editors remove model photos" ON public.model_photos;
CREATE POLICY "Asset editors remove model photos" ON public.model_photos
  FOR DELETE TO authenticated USING ((SELECT private.has_perm('assets.edit')));

DROP TRIGGER IF EXISTS update_model_photos_updated_at ON public.model_photos;
CREATE TRIGGER update_model_photos_updated_at BEFORE UPDATE ON public.model_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public bucket so cards load photos by plain URL (cacheable); images only, shrunk to ~800px in the
-- browser before upload, so 2 MB is plenty.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('model-photos', 'model-photos', true, 2097152, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 2097152, allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

DROP POLICY IF EXISTS "Signed-in users list model photos" ON storage.objects;
CREATE POLICY "Signed-in users list model photos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'model-photos');
DROP POLICY IF EXISTS "Asset editors upload model photos" ON storage.objects;
CREATE POLICY "Asset editors upload model photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'model-photos' AND (SELECT private.has_perm('assets.edit')));
DROP POLICY IF EXISTS "Asset editors delete model photos" ON storage.objects;
CREATE POLICY "Asset editors delete model photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'model-photos' AND (SELECT private.has_perm('assets.edit')));

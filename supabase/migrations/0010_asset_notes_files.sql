-- Activity notes and file attachments on assets (asset page → Activity / Files).
-- Requires 0009 (private.has_perm).

-- =====================================================
-- Notes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.asset_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL DEFAULT auth.uid(),
  author_name TEXT,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asset_notes_asset ON public.asset_notes(asset_id, created_at DESC);
ALTER TABLE public.asset_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can read notes" ON public.asset_notes;
CREATE POLICY "Signed-in users can read notes" ON public.asset_notes
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
-- Anyone signed in can leave a note, but only as themselves.
DROP POLICY IF EXISTS "Users add their own notes" ON public.asset_notes;
CREATE POLICY "Users add their own notes" ON public.asset_notes
  FOR INSERT TO authenticated WITH CHECK (author_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Authors and admins delete notes" ON public.asset_notes;
CREATE POLICY "Authors and admins delete notes" ON public.asset_notes
  FOR DELETE TO authenticated USING (author_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));

-- =====================================================
-- Files: metadata here, bytes in the private "asset-files" storage bucket
-- (object path = <asset_id>/<random>-<filename>)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.asset_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  size_bytes BIGINT,
  mime_type TEXT,
  kind TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('invoice', 'handover', 'repair', 'photo', 'other')),
  uploaded_by UUID DEFAULT auth.uid(),
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asset_files_asset ON public.asset_files(asset_id, created_at DESC);
ALTER TABLE public.asset_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can read file records" ON public.asset_files;
CREATE POLICY "Signed-in users can read file records" ON public.asset_files
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Asset writers add file records" ON public.asset_files;
CREATE POLICY "Asset writers add file records" ON public.asset_files
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.has_perm('assets.edit')) OR (SELECT private.has_perm('maintenance.manage')) OR (SELECT private.has_perm('assets.checkout')));
DROP POLICY IF EXISTS "Asset writers delete file records" ON public.asset_files;
CREATE POLICY "Asset writers delete file records" ON public.asset_files
  FOR DELETE TO authenticated USING ((SELECT private.has_perm('assets.edit')));

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('asset-files', 'asset-files', false, 20971520) -- 20 MB per file
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Signed-in users can read asset files" ON storage.objects;
CREATE POLICY "Signed-in users can read asset files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'asset-files');
DROP POLICY IF EXISTS "Asset writers can upload asset files" ON storage.objects;
CREATE POLICY "Asset writers can upload asset files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'asset-files' AND ((SELECT private.has_perm('assets.edit')) OR (SELECT private.has_perm('maintenance.manage')) OR (SELECT private.has_perm('assets.checkout'))));
DROP POLICY IF EXISTS "Asset editors can delete asset files" ON storage.objects;
CREATE POLICY "Asset editors can delete asset files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'asset-files' AND (SELECT private.has_perm('assets.edit')));

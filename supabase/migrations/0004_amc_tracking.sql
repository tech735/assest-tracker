-- Adds AMC (Annual Maintenance Contract) tracking to assets and a notification log
-- used to send expiry reminder emails without duplicating sends for the same
-- asset/reminder-stage/contract-end-date combination.

-- =====================================================
-- ASSETS: AMC DATE FIELDS
-- =====================================================
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS amc_start_date DATE,
  ADD COLUMN IF NOT EXISTS amc_end_date DATE;

CREATE INDEX IF NOT EXISTS idx_assets_amc_end_date ON assets(amc_end_date);

-- =====================================================
-- AMC NOTIFICATIONS TABLE
-- Tracks which reminder stages (e.g. 30/15/7 days before expiry) have already
-- been emailed for a given asset. The unique constraint includes amc_end_date so
-- that renewing a contract (changing amc_end_date) naturally allows the reminder
-- cycle to run again, and reruns of the scheduled job cannot send duplicates.
-- =====================================================
-- gen_random_uuid() is built into Postgres core (13+) and needs no extension —
-- used here instead of uuid_generate_v4() (uuid-ossp) so this migration doesn't
-- depend on that extension being enabled/visible on the search_path used by
-- whatever connection applies it (CLI push vs. Dashboard SQL editor differ).
CREATE TABLE IF NOT EXISTS amc_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  reminder_days INTEGER NOT NULL,
  amc_end_date DATE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (asset_id, reminder_days, amc_end_date)
);

CREATE INDEX IF NOT EXISTS idx_amc_notifications_asset_id ON amc_notifications(asset_id);

ALTER TABLE amc_notifications ENABLE ROW LEVEL SECURITY;

-- Matches the permissive dev-style policy used by every other table in this
-- schema. Writes to this table happen from the amc-expiry-check edge function
-- using the service role key, which bypasses RLS regardless.
CREATE POLICY "Allow all operations on amc_notifications" ON amc_notifications
  FOR ALL USING (true) WITH CHECK (true);

-- Resolves Performance Advisor 0001 unindexed_foreign_keys: cover the remaining foreign keys so
-- deletes on the parent table and joins by these columns don't scan the whole child table.
CREATE INDEX IF NOT EXISTS idx_alerts_asset_id ON public.alerts (asset_id);
CREATE INDEX IF NOT EXISTS idx_employees_location_id ON public.employees (location_id);

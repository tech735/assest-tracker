-- Phase 1+2: assignment/return rigor, bundle assignment, repair & lost workflows, offboarding
-- Apply manually via Supabase SQL editor (project has no migration CLI wired up).

-- =====================================================
-- ASSIGNMENTS: turn into a general event log
-- =====================================================

ALTER TABLE assignments
  ALTER COLUMN employee_id DROP NOT NULL,
  ALTER COLUMN employee_name DROP NOT NULL;

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'assign'
    CHECK (event_type IN ('assign', 'return', 'repair_start', 'repair_end', 'lost', 'found')),
  ADD COLUMN IF NOT EXISTS handed_over_by TEXT,
  ADD COLUMN IF NOT EXISTS received_by TEXT,
  ADD COLUMN IF NOT EXISTS bundle_id UUID;

COMMENT ON COLUMN assignments.assigned_date IS 'Event date for this row (assign, return, repair, lost/found) - name kept for backward compatibility.';

CREATE INDEX IF NOT EXISTS idx_assignments_event_type ON assignments(event_type);
CREATE INDEX IF NOT EXISTS idx_assignments_bundle_id ON assignments(bundle_id);

-- =====================================================
-- ASSETS: repair & lost metadata
-- =====================================================

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS repair_vendor TEXT,
  ADD COLUMN IF NOT EXISTS repair_est_return DATE,
  ADD COLUMN IF NOT EXISTS repair_cost DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS repair_notes TEXT,
  ADD COLUMN IF NOT EXISTS lost_reference TEXT,
  ADD COLUMN IF NOT EXISTS lost_notes TEXT;

-- =====================================================
-- EMPLOYEES: offboarding without deletion
-- =====================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS exit_date DATE;

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_status_check;

ALTER TABLE employees
  ADD CONSTRAINT employees_status_check
    CHECK (status IN ('active', 'inactive', 'on-leave', 'remote', 'offboarded'));

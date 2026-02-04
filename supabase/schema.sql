-- Asset Compass Database Schema
-- This schema defines all tables for the asset management system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- LOCATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('office', 'warehouse', 'remote', 'outlet')),
  address TEXT,
  assets_count INTEGER DEFAULT 0,
  employees_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EMPLOYEES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  avatar_url TEXT,
  assets_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave', 'remote')),
  join_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ASSETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_tag TEXT UNIQUE NOT NULL,
  serial_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'repair', 'retired', 'lost')),
  condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair', 'poor')),
  location TEXT NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  assigned_to TEXT,
  assigned_to_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  purchase_date DATE NOT NULL,
  purchase_cost DECIMAL(10, 2) NOT NULL,
  vendor TEXT NOT NULL,
  warranty_start DATE,
  warranty_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  asset_tag TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_date DATE,
  condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair', 'poor')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('warranty', 'overdue', 'missing', 'approval', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_location_id ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to_id ON assets(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_assignments_asset_id ON assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee_id ON assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_is_resolved ON alerts(is_resolved);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Triggers to automatically update updated_at
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-GENERATION TRIGGERS
-- =====================================================

-- 1. Create sequence for asset tags
CREATE SEQUENCE IF NOT EXISTS asset_tag_seq START WITH 1001;

-- 2. Function to generate asset tag
CREATE OR REPLACE FUNCTION generate_asset_tag()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
BEGIN
    -- Only generate if asset_tag is NULL or empty
    IF NEW.asset_tag IS NULL OR NEW.asset_tag = '' THEN
        -- Get prefix from settings
        SELECT (config->>'tagPrefix') INTO prefix FROM app_settings LIMIT 1;
        
        -- Fallback to default if no settings exist
        IF prefix IS NULL THEN
            prefix := 'AST-';
        END IF;
        
        -- Generate tag: Prefix + sequence number (padded for consistency, e.g., 0001)
        NEW.asset_tag := prefix || LPAD(nextval('asset_tag_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to call the function before insert
DROP TRIGGER IF EXISTS tr_generate_asset_tag ON assets;
CREATE TRIGGER tr_generate_asset_tag
BEFORE INSERT ON assets
FOR EACH ROW
EXECUTE FUNCTION generate_asset_tag();

-- =====================================================
-- SYNCHRONIZATION FUNCTIONS
-- =====================================================

-- 1. Sync employee assets_count when assets are assigned/unassigned
CREATE OR REPLACE FUNCTION sync_employee_assets_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.assigned_to_id IS NOT NULL THEN
            UPDATE employees SET assets_count = assets_count + 1 WHERE id = NEW.assigned_to_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id THEN
            IF OLD.assigned_to_id IS NOT NULL THEN
                UPDATE employees SET assets_count = assets_count - 1 WHERE id = OLD.assigned_to_id;
            END IF;
            IF NEW.assigned_to_id IS NOT NULL THEN
                UPDATE employees SET assets_count = assets_count + 1 WHERE id = NEW.assigned_to_id;
            END IF;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.assigned_to_id IS NOT NULL THEN
            UPDATE employees SET assets_count = assets_count - 1 WHERE id = OLD.assigned_to_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Sync location assets_count when assets are created/moved/deleted
CREATE OR REPLACE FUNCTION sync_location_assets_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.location_id IS NOT NULL THEN
            UPDATE locations SET assets_count = assets_count + 1 WHERE id = NEW.location_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
            IF OLD.location_id IS NOT NULL THEN
                UPDATE locations SET assets_count = assets_count - 1 WHERE id = OLD.location_id;
            END IF;
            IF NEW.location_id IS NOT NULL THEN
                UPDATE locations SET assets_count = assets_count + 1 WHERE id = NEW.location_id;
            END IF;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.location_id IS NOT NULL THEN
            UPDATE locations SET assets_count = assets_count - 1 WHERE id = OLD.location_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Sync location employees_count when employees are created/moved/deleted
CREATE OR REPLACE FUNCTION sync_location_employees_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.location_id IS NOT NULL THEN
            UPDATE locations SET employees_count = employees_count + 1 WHERE id = NEW.location_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
            IF OLD.location_id IS NOT NULL THEN
                UPDATE locations SET employees_count = employees_count - 1 WHERE id = OLD.location_id;
            END IF;
            IF NEW.location_id IS NOT NULL THEN
                UPDATE locations SET employees_count = employees_count + 1 WHERE id = NEW.location_id;
            END IF;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.location_id IS NOT NULL THEN
            UPDATE locations SET employees_count = employees_count - 1 WHERE id = OLD.location_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Sync Names (Keep denormalized name strings updated if master record changes)
CREATE OR REPLACE FUNCTION sync_related_names()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'employees') THEN
        IF OLD.name IS DISTINCT FROM NEW.name THEN
            UPDATE assets SET assigned_to = NEW.name WHERE assigned_to_id = NEW.id;
            UPDATE assignments SET employee_name = NEW.name WHERE employee_id = NEW.id;
        END IF;
    ELSIF (TG_TABLE_NAME = 'locations') THEN
        IF OLD.name IS DISTINCT FROM NEW.name THEN
            UPDATE assets SET location = NEW.name WHERE location_id = NEW.id;
            UPDATE employees SET location = NEW.name WHERE location_id = NEW.id;
        END IF;
    ELSIF (TG_TABLE_NAME = 'assets') THEN
        IF OLD.name IS DISTINCT FROM NEW.name THEN
            UPDATE assignments SET asset_name = NEW.name WHERE asset_id = NEW.id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SYNCHRONIZATION TRIGGERS
-- =====================================================

-- Triggers for counts
DROP TRIGGER IF EXISTS tr_sync_employee_assets_count ON assets;
CREATE TRIGGER tr_sync_employee_assets_count AFTER INSERT OR UPDATE OR DELETE ON assets FOR EACH ROW EXECUTE FUNCTION sync_employee_assets_count();

DROP TRIGGER IF EXISTS tr_sync_location_assets_count ON assets;
CREATE TRIGGER tr_sync_location_assets_count AFTER INSERT OR UPDATE OR DELETE ON assets FOR EACH ROW EXECUTE FUNCTION sync_location_assets_count();

DROP TRIGGER IF EXISTS tr_sync_location_employees_count ON employees;
CREATE TRIGGER tr_sync_location_employees_count AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION sync_location_employees_count();

-- Triggers for names
DROP TRIGGER IF EXISTS tr_sync_employee_names ON employees;
CREATE TRIGGER tr_sync_employee_names AFTER UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION sync_related_names();

DROP TRIGGER IF EXISTS tr_sync_location_names ON locations;
CREATE TRIGGER tr_sync_location_names AFTER UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION sync_related_names();

DROP TRIGGER IF EXISTS tr_sync_asset_names ON assets;
CREATE TRIGGER tr_sync_asset_names AFTER UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION sync_related_names();

-- Run initial sync
UPDATE employees e SET assets_count = (SELECT count(*) FROM assets a WHERE a.assigned_to_id = e.id);
UPDATE locations l SET assets_count = (SELECT count(*) FROM assets a WHERE a.location_id = l.id);
UPDATE locations l SET employees_count = (SELECT count(*) FROM employees e WHERE e.location_id = l.id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security requirements)
-- For now, allowing all operations for authenticated users

CREATE POLICY "Allow all operations on locations" ON locations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on employees" ON employees
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on assets" ON assets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on assignments" ON assignments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on alerts" ON alerts
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- APP SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config JSONB NOT NULL DEFAULT '{
    "orgName": "Asset Compass",
    "tagPrefix": "AST-",
    "currency": "USD",
    "timezone": "UTC",
    "notifications": {
      "warrantyAlerts": true,
      "assignmentNotifications": true,
      "lowStockAlerts": false,
      "emailDigest": true
    },
    "categories": ["Laptops", "Desktops", "Phones", "Tablets", "Monitors", "Accessories"],
    "roles": [
      {"name": "Super Admin", "description": "Full access to all features"},
      {"name": "IT Admin", "description": "Manage assets, assignments, and reports"},
      {"name": "Warehouse Operator", "description": "Issue/receive assets, update status"},
      {"name": "Employee", "description": "View own assigned assets"},
      {"name": "Auditor", "description": "Read-only access to reports"}
    ]
  }'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on app_settings" ON app_settings
  FOR ALL USING (true) WITH CHECK (true);

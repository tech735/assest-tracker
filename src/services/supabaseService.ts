import { supabase } from '@/lib/supabase';
import { Alert } from '@/types/alert';
import { Asset, AssetCategory, AssetCondition, AssetStatus, Assignment, DashboardStats, Employee, Location } from '@/types/asset';

// =====================================================
// MAPPING UTILITIES
// =====================================================

const mapAsset = (data: any): Asset => ({
    id: data.id,
    assetTag: data.asset_tag,
    serialNumber: data.serial_number,
    name: data.name,
    brand: data.brand,
    model: data.model,
    category: data.category,
    status: data.status,
    condition: data.condition,
    location: data.location,
    locationId: data.location_id,
    assignedTo: data.assigned_to,
    assignedToId: data.assigned_to_id,
    purchaseDate: data.purchase_date,
    purchaseCost: data.purchase_cost,
    vendor: data.vendor,
    warrantyStart: data.warranty_start,
    warrantyEnd: data.warranty_end,
    notes: data.notes,
    repairVendor: data.repair_vendor,
    repairEstReturn: data.repair_est_return,
    repairCost: data.repair_cost,
    repairNotes: data.repair_notes,
    lostReference: data.lost_reference,
    lostNotes: data.lost_notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
});

const mapEmployee = (data: any): Employee => ({
    id: data.id,
    name: data.name,
    email: data.email,
    department: data.department,
    position: data.position,
    location: data.location,
    locationId: data.location_id,
    avatarUrl: data.avatar_url,
    assetsCount: data.assets_count || 0,
    status: data.status,
    joinDate: data.join_date,
    exitDate: data.exit_date,
});

const mapLocation = (data: any): Location => ({
    id: data.id,
    name: data.name,
    type: data.type,
    address: data.address,
    assetsCount: data.assets_count || 0,
    employeesCount: data.employees_count || 0,
});

const mapAssignment = (data: any): Assignment => ({
    id: data.id,
    assetId: data.asset_id,
    assetTag: data.asset_tag,
    assetName: data.asset_name,
    employeeId: data.employee_id,
    employeeName: data.employee_name,
    eventType: data.event_type || 'assign',
    assignedDate: data.assigned_date,
    returnDate: data.return_date,
    condition: data.condition,
    handedOverBy: data.handed_over_by,
    receivedBy: data.received_by,
    bundleId: data.bundle_id,
    notes: data.notes,
});

const mapAlert = (data: any): Alert => ({
    id: data.id,
    type: data.type,
    title: data.title,
    description: data.description,
    assetId: data.asset_id,
    severity: data.severity,
    isResolved: data.is_resolved,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
});

// =====================================================
// ASSET OPERATIONS
// =====================================================

export async function getAssets(): Promise<Asset[]> {
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapAsset);
}

export async function getAssetById(id: string): Promise<Asset | null> {
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data ? mapAsset(data) : null;
}

export async function createAsset(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    const { data, error } = await supabase
        .from('assets')
        .insert([{
            asset_tag: asset.assetTag,
            serial_number: asset.serialNumber,
            name: asset.name,
            brand: asset.brand,
            model: asset.model,
            category: asset.category,
            status: asset.status,
            condition: asset.condition,
            location: asset.location,
            location_id: asset.locationId,
            assigned_to: asset.assignedTo,
            assigned_to_id: asset.assignedToId,
            purchase_date: asset.purchaseDate,
            purchase_cost: asset.purchaseCost,
            vendor: asset.vendor,
            warranty_start: asset.warrantyStart,
            warranty_end: asset.warrantyEnd,
            notes: asset.notes,
            repair_vendor: asset.repairVendor,
            repair_est_return: asset.repairEstReturn,
            repair_cost: asset.repairCost,
            repair_notes: asset.repairNotes,
            lost_reference: asset.lostReference,
            lost_notes: asset.lostNotes,
        }])
        .select()
        .single();

    if (error) throw error;
    return mapAsset(data);
}

export async function updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
    const { data, error } = await supabase
        .from('assets')
        .update({
            asset_tag: updates.assetTag,
            serial_number: updates.serialNumber,
            name: updates.name,
            brand: updates.brand,
            model: updates.model,
            category: updates.category,
            status: updates.status,
            condition: updates.condition,
            location: updates.location,
            location_id: updates.locationId,
            assigned_to: updates.assignedTo,
            assigned_to_id: updates.assignedToId,
            purchase_date: updates.purchaseDate,
            purchase_cost: updates.purchaseCost,
            vendor: updates.vendor,
            warranty_start: updates.warrantyStart,
            warranty_end: updates.warrantyEnd,
            notes: updates.notes,
            repair_vendor: updates.repairVendor,
            repair_est_return: updates.repairEstReturn,
            repair_cost: updates.repairCost,
            repair_notes: updates.repairNotes,
            lost_reference: updates.lostReference,
            lost_notes: updates.lostNotes,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return mapAsset(data);
}

export async function deleteAsset(id: string): Promise<void> {
    const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function returnAsset({
    assetId,
    condition,
    receivedBy,
    notes,
    locationId,
    locationName,
}: {
    assetId: string;
    condition: AssetCondition;
    receivedBy?: string;
    notes?: string;
    locationId?: string;
    locationName?: string;
}): Promise<void> {
    // 1. Update asset status, condition and location
    const updateData: any = {
        status: 'available',
        assigned_to: null,
        assigned_to_id: null,
        condition,
    };

    if (locationId) updateData.location_id = locationId;
    if (locationName) updateData.location = locationName;

    const { error: assetError } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', assetId);

    if (assetError) throw assetError;

    // 2. Close out the active assignment with return details
    const { error: assignmentError } = await supabase
        .from('assignments')
        .update({
            event_type: 'return',
            return_date: new Date().toISOString(),
            condition,
            received_by: receivedBy,
            notes,
        })
        .eq('asset_id', assetId)
        .is('return_date', null);

    if (assignmentError) throw assignmentError;
}

// =====================================================
// BUNDLE ASSIGNMENT
// =====================================================

export async function assignAssetsBundle({
    assetIds,
    employeeId,
    handoverDate,
    handedOverBy,
    condition,
    notes,
}: {
    assetIds: string[];
    employeeId: string;
    handoverDate: string;
    handedOverBy?: string;
    condition: AssetCondition;
    notes?: string;
}): Promise<void> {
    const [{ data: employeeRow, error: employeeError }, { data: assetRows, error: assetsError }] = await Promise.all([
        supabase.from('employees').select('*').eq('id', employeeId).single(),
        supabase.from('assets').select('*').in('id', assetIds),
    ]);

    if (employeeError) throw employeeError;
    if (assetsError) throw assetsError;

    const employee = mapEmployee(employeeRow);
    const assets = (assetRows || []).map(mapAsset);
    const bundleId = crypto.randomUUID();

    const { error: updateError } = await supabase
        .from('assets')
        .update({
            status: 'assigned',
            assigned_to: employee.name,
            assigned_to_id: employee.id,
            location: employee.location,
            location_id: employee.locationId,
            condition,
        })
        .in('id', assetIds);

    if (updateError) throw updateError;

    await createAssignments(assets.map(asset => ({
        assetId: asset.id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        employeeId: employee.id,
        employeeName: employee.name,
        eventType: 'assign',
        assignedDate: handoverDate,
        condition,
        handedOverBy,
        bundleId,
        notes,
    })));
}

// =====================================================
// REPAIR WORKFLOW
// =====================================================

export async function startRepair({
    assetId,
    vendor,
    estReturn,
    cost,
    notes,
}: {
    assetId: string;
    vendor: string;
    estReturn?: string;
    cost?: number;
    notes?: string;
}): Promise<void> {
    const asset = await getAssetById(assetId);
    if (!asset) throw new Error('Asset not found');

    const { error: assetError } = await supabase
        .from('assets')
        .update({
            status: 'repair',
            repair_vendor: vendor,
            repair_est_return: estReturn,
            repair_cost: cost,
            repair_notes: notes,
        })
        .eq('id', assetId);

    if (assetError) throw assetError;

    await createAssignment({
        assetId: asset.id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        eventType: 'repair_start',
        assignedDate: new Date().toISOString(),
        condition: asset.condition,
        notes: [vendor && `Vendor: ${vendor}`, notes].filter(Boolean).join(' — '),
    });
}

export async function endRepair({
    assetId,
    condition,
    notes,
}: {
    assetId: string;
    condition: AssetCondition;
    notes?: string;
}): Promise<void> {
    const asset = await getAssetById(assetId);
    if (!asset) throw new Error('Asset not found');

    const { error: assetError } = await supabase
        .from('assets')
        .update({
            status: 'available',
            condition,
            repair_vendor: null,
            repair_est_return: null,
            repair_cost: null,
            repair_notes: null,
        })
        .eq('id', assetId);

    if (assetError) throw assetError;

    await createAssignment({
        assetId: asset.id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        eventType: 'repair_end',
        assignedDate: new Date().toISOString(),
        condition,
        notes,
    });
}

// =====================================================
// LOST / FOUND WORKFLOW
// =====================================================

export async function markLost({
    assetId,
    reference,
    notes,
}: {
    assetId: string;
    reference?: string;
    notes?: string;
}): Promise<void> {
    const asset = await getAssetById(assetId);
    if (!asset) throw new Error('Asset not found');

    const { error: assetError } = await supabase
        .from('assets')
        .update({
            status: 'lost',
            lost_reference: reference,
            lost_notes: notes,
        })
        .eq('id', assetId);

    if (assetError) throw assetError;

    await createAssignment({
        assetId: asset.id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        eventType: 'lost',
        assignedDate: new Date().toISOString(),
        condition: asset.condition,
        notes: [reference && `Reference: ${reference}`, notes].filter(Boolean).join(' — '),
    });
}

export async function markFound({
    assetId,
    condition,
    notes,
}: {
    assetId: string;
    condition: AssetCondition;
    notes?: string;
}): Promise<void> {
    const asset = await getAssetById(assetId);
    if (!asset) throw new Error('Asset not found');

    const { error: assetError } = await supabase
        .from('assets')
        .update({
            status: 'available',
            condition,
            lost_reference: null,
            lost_notes: null,
        })
        .eq('id', assetId);

    if (assetError) throw assetError;

    await createAssignment({
        assetId: asset.id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        eventType: 'found',
        assignedDate: new Date().toISOString(),
        condition,
        notes,
    });
}

// =====================================================
// OFFBOARDING
// =====================================================

export async function offboardEmployee({ id, exitDate }: { id: string; exitDate: string }): Promise<Employee> {
    return updateEmployee(id, { status: 'offboarded', exitDate });
}


// =====================================================
// EMPLOYEE OPERATIONS
// =====================================================

export async function getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapEmployee);
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data ? mapEmployee(data) : null;
}

export async function createEmployee(employee: Omit<Employee, 'id' | 'assetsCount'>): Promise<Employee> {
    const { data, error } = await supabase
        .from('employees')
        .insert([{
            name: employee.name,
            email: employee.email,
            department: employee.department,
            position: employee.position,
            location: employee.location,
            location_id: employee.locationId,
            avatar_url: employee.avatarUrl,
            status: employee.status,
            join_date: employee.joinDate,
            exit_date: employee.exitDate,
        }])
        .select()
        .single();

    if (error) throw error;
    return mapEmployee(data);
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
        .from('employees')
        .update({
            name: updates.name,
            email: updates.email,
            department: updates.department,
            position: updates.position,
            location: updates.location,
            location_id: updates.locationId,
            avatar_url: updates.avatarUrl,
            status: updates.status,
            join_date: updates.joinDate,
            exit_date: updates.exitDate,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return mapEmployee(data);
}

export async function deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// =====================================================
// LOCATION OPERATIONS
// =====================================================

export async function getLocations(): Promise<Location[]> {
    const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapLocation);
}

export async function getLocationById(id: string): Promise<Location | null> {
    const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data ? mapLocation(data) : null;
}

export async function createLocation(location: Omit<Location, 'id' | 'assetsCount' | 'employeesCount'>): Promise<Location> {
    const { data, error } = await supabase
        .from('locations')
        .insert([{
            name: location.name,
            type: location.type,
            address: location.address,
        }])
        .select()
        .single();

    if (error) throw error;
    return mapLocation(data);
}

export async function updateLocation(id: string, updates: Partial<Location>): Promise<Location> {
    const { data, error } = await supabase
        .from('locations')
        .update({
            name: updates.name,
            type: updates.type,
            address: updates.address,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return mapLocation(data);
}

export async function deleteLocation(id: string): Promise<void> {
    const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// =====================================================
// ASSIGNMENT OPERATIONS
// =====================================================

export async function getAssignments(): Promise<Assignment[]> {
    const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('assigned_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapAssignment);
}

export async function getAssignmentsByAssetId(assetId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('asset_id', assetId)
        .order('assigned_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapAssignment);
}

export async function createAssignment(assignment: Omit<Assignment, 'id'>): Promise<Assignment> {
    const { data, error } = await supabase
        .from('assignments')
        .insert([{
            asset_id: assignment.assetId,
            asset_tag: assignment.assetTag,
            asset_name: assignment.assetName,
            employee_id: assignment.employeeId,
            employee_name: assignment.employeeName,
            event_type: assignment.eventType || 'assign',
            assigned_date: assignment.assignedDate,
            return_date: assignment.returnDate,
            condition: assignment.condition,
            handed_over_by: assignment.handedOverBy,
            received_by: assignment.receivedBy,
            bundle_id: assignment.bundleId,
            notes: assignment.notes,
        }])
        .select()
        .single();

    if (error) throw error;
    return mapAssignment(data);
}

export async function createAssignments(assignments: Omit<Assignment, 'id'>[]): Promise<Assignment[]> {
    const { data, error } = await supabase
        .from('assignments')
        .insert(assignments.map(assignment => ({
            asset_id: assignment.assetId,
            asset_tag: assignment.assetTag,
            asset_name: assignment.assetName,
            employee_id: assignment.employeeId,
            employee_name: assignment.employeeName,
            event_type: assignment.eventType || 'assign',
            assigned_date: assignment.assignedDate,
            return_date: assignment.returnDate,
            condition: assignment.condition,
            handed_over_by: assignment.handedOverBy,
            received_by: assignment.receivedBy,
            bundle_id: assignment.bundleId,
            notes: assignment.notes,
        })))
        .select();

    if (error) throw error;
    return (data || []).map(mapAssignment);
}

export async function deleteAssignment(id: string): Promise<void> {
    const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// =====================================================
// ALERT OPERATIONS
// =====================================================

export async function getAlerts(): Promise<Alert[]> {
    const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapAlert);
}

export async function createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'updatedAt' | 'isResolved'>): Promise<Alert> {
    const { data, error } = await supabase
        .from('alerts')
        .insert([{
            type: alert.type,
            title: alert.title,
            description: alert.description,
            asset_id: alert.assetId,
            severity: alert.severity,
        }])
        .select()
        .single();

    if (error) throw error;
    return mapAlert(data);
}

export async function updateAlert(id: string, updates: Partial<Alert>): Promise<Alert> {
    const { data, error } = await supabase
        .from('alerts')
        .update({
            type: updates.type,
            title: updates.title,
            description: updates.description,
            severity: updates.severity,
            asset_id: updates.assetId,
            is_resolved: updates.isResolved,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return mapAlert(data);
}

export async function deleteAlert(id: string): Promise<void> {
    const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function resolveAlert(id: string): Promise<void> {
    const { error } = await supabase
        .from('alerts')
        .update({ is_resolved: true })
        .eq('id', id);

    if (error) throw error;
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export async function getDashboardStats(): Promise<DashboardStats> {
    const { data: assets, error } = await supabase
        .from('assets')
        .select('status');

    if (error) throw error;

    const stats: DashboardStats = {
        totalAssets: assets?.length || 0,
        assigned: assets?.filter(a => a.status === 'assigned').length || 0,
        available: assets?.filter(a => a.status === 'available').length || 0,
        inRepair: assets?.filter(a => a.status === 'repair').length || 0,
        retired: assets?.filter(a => a.status === 'retired').length || 0,
    };

    return stats;
}

// =====================================================
// SETTINGS OPERATIONS
// =====================================================

export const DEFAULT_SETTINGS = {
    orgName: "Asset Compass",
    tagPrefix: "AST-",
    currency: "INR",
    timezone: "UTC",
    notifications: {
        warrantyAlerts: true,
        assignmentNotifications: true,
        lowStockAlerts: false,
        emailDigest: true
    },
    categories: ["Laptops", "Desktops", "Phones", "Tablets", "Monitors", "Accessories"],
    roles: [
        { name: "Super Admin", description: "Full access to all features" },
        { name: "IT Admin", description: "Manage assets, assignments, and reports" },
        { name: "Warehouse Operator", description: "Issue/receive assets, update status" },
        { name: "Employee", description: "View own assigned assets" },
        { name: "Auditor", description: "Read-only access to reports" }
    ]
};

export async function getSettings(): Promise<any> {
    const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .maybeSingle(); // maybeSingle returns null instead of error for 0 rows

    if (error) throw error;
    return data?.config || DEFAULT_SETTINGS;
}

export async function updateSettings(config: any): Promise<any> {
    // First check if a row exists
    const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1)
        .single();

    if (existing) {
        const { data, error } = await supabase
            .from('app_settings')
            .update({ config, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
        if (error) throw error;
        return data.config;
    } else {
        const { data, error } = await supabase
            .from('app_settings')
            .insert([{ config }])
            .select()
            .single();
        if (error) throw error;
        return data.config;
    }
}

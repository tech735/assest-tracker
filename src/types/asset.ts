// Asset Management Portal - Core Types

export type AssetStatus = 'available' | 'assigned' | 'repair' | 'lost' | 'retired';
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor';
export type AssetCategory = 'laptop' | 'desktop' | 'phone' | 'tablet' | 'monitor' | 'accessory' | 'other';

export interface Asset {
  id: string;
  assetTag: string;
  serialNumber: string;
  name: string;
  brand: string;
  model: string;
  category: AssetCategory;
  status: AssetStatus;
  condition: AssetCondition;
  location: string;
  locationId: string;
  assignedTo?: string;
  assignedToId?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  vendor?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  notes?: string;
  repairVendor?: string;
  repairEstReturn?: string;
  repairCost?: number;
  repairNotes?: string;
  lostReference?: string;
  lostNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  location: string;
  locationId?: string;
  avatarUrl?: string;
  assetsCount: number;
  status: 'active' | 'inactive' | 'on-leave' | 'remote' | 'offboarded';
  joinDate: string;
  exitDate?: string;
}

export interface Location {
  id: string;
  name: string;
  type: 'office' | 'warehouse' | 'remote' | 'outlet';
  address?: string;
  assetsCount: number;
  employeesCount: number;
}

export type AssignmentEventType = 'assign' | 'return' | 'repair_start' | 'repair_end' | 'lost' | 'found';

export interface Assignment {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  employeeId?: string;
  employeeName?: string;
  eventType: AssignmentEventType;
  assignedDate: string;
  returnDate?: string;
  condition: AssetCondition;
  handedOverBy?: string;
  receivedBy?: string;
  bundleId?: string;
  notes?: string;
}

export interface DashboardStats {
  totalAssets: number;
  assigned: number;
  available: number;
  inRepair: number;
  retired: number;
}



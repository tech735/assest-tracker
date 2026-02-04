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
  status: 'active' | 'inactive' | 'on-leave' | 'remote';
  joinDate: string;
}

export interface Location {
  id: string;
  name: string;
  type: 'office' | 'warehouse' | 'remote' | 'outlet';
  address?: string;
  assetsCount: number;
  employeesCount: number;
}

export interface Assignment {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  employeeId: string;
  employeeName: string;
  assignedDate: string;
  returnDate?: string;
  condition: AssetCondition;
  notes?: string;
}

export interface DashboardStats {
  totalAssets: number;
  assigned: number;
  available: number;
  inRepair: number;
  retired: number;
}

export interface Alert {
  id: string;
  type: 'warranty' | 'overdue' | 'missing' | 'approval';
  title: string;
  description: string;
  assetId?: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
}

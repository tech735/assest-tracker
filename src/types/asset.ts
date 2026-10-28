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
  amcStartDate?: string;
  amcEndDate?: string;
  amcContractId?: string;
  warrantyContractId?: string;
  purchaseInvoiceId?: string;
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

export type RepairRequestStatus = 'open' | 'in_progress' | 'resolved' | 'declined';
export type RepairUrgency = 'low' | 'normal' | 'high';

/** A problem an employee reported with an asset they hold (My assets → Report a problem). */
export interface RepairRequest {
  id: string;
  assetId: string;
  assetTag?: string;
  assetName?: string;
  issue: string;
  urgency: RepairUrgency;
  status: RepairRequestStatus;
  itNote?: string;
  reportedBy?: string;
  reporterName?: string;
  reporterEmail?: string;
  createdAt: string;
  closedAt?: string;
}

export type ContractKind = 'amc' | 'warranty';
export type ContractCoverage = 'comprehensive' | 'non_comprehensive';

/** An AMC or vendor warranty covering a set of assets (Maintenance → Contracts). */
export interface ServiceContract {
  id: string;
  kind: ContractKind;
  vendor: string;
  reference?: string;
  coverage: ContractCoverage;
  category?: string;
  startDate: string;
  endDate: string;
  units?: number;
  rate?: number;
  taxPercent?: number;
  totalAmount?: number;
  currency: string;
  covers?: string;
  excludes?: string;
  supportContact?: string;
  notes?: string;
  documentPath?: string;
  documentName?: string;
  createdAt: string;
}

/** A vendor's tax invoice for one delivery (Purchases). Assets bought on it link back to it. */
export interface PurchaseInvoice {
  id: string;
  vendor: string;
  invoiceNumber?: string;
  invoiceDate: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency: string;
  notes?: string;
  documentPath?: string;
  documentName?: string;
  createdAt: string;
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



// ----- Phase 2: notes, files, audits, e-signed handovers -----

export interface AssetNote {
  id: string;
  assetId: string;
  authorId: string;
  authorName?: string;
  body: string;
  createdAt: string;
}

export type AssetFileKind = 'invoice' | 'handover' | 'repair' | 'photo' | 'other';

export interface AssetFile {
  id: string;
  assetId: string;
  storagePath: string;
  fileName: string;
  sizeBytes?: number;
  mimeType?: string;
  kind: AssetFileKind;
  uploadedByName?: string;
  createdAt: string;
}

export interface Audit {
  id: string;
  name: string;
  locationId?: string;
  locationName?: string;
  status: 'in_progress' | 'closed';
  dueDate?: string;
  notes?: string;
  expectedCount: number;
  accuracy?: number;
  startedByName?: string;
  startedAt: string;
  closedAt?: string;
}

export interface AuditItem {
  auditId: string;
  assetId: string;
  assetTag?: string;
  assetName?: string;
  serialNumber?: string;
}

export type AuditScanResult = 'found' | 'misplaced' | 'unexpected';

export interface AuditScan {
  id: string;
  auditId: string;
  assetId?: string;
  code: string;
  result: AuditScanResult;
  scannedByName?: string;
  scannedAt: string;
}

export interface HandoverItem {
  assetId: string;
  tag: string;
  name: string;
  serial?: string;
  brand?: string;
  condition?: string;
  accessories?: string;
}

export interface HandoverDocument {
  id: string;
  docNo: number;
  kind: 'handover' | 'return';
  employeeId?: string;
  employeeName: string;
  employeeEmail: string;
  locationName?: string;
  items: HandoverItem[];
  handedOverBy?: string;
  notes?: string;
  status: 'pending' | 'signed' | 'void';
  createdByName?: string;
  createdAt: string;
  signedAt?: string;
  signerName?: string;
  signature?: string;
}

// Phase 2 data access: permissions, notes, files, audits and e-signed handover documents.
// Tables/policies come from supabase/migrations/0009–0012.
import { supabase } from '@/lib/supabase';
import type {
  AssetFile,
  AssetFileKind,
  AssetNote,
  Audit,
  AuditItem,
  AuditScan,
  AuditScanResult,
  HandoverDocument,
  HandoverItem,
} from '@/types/asset';
import type { UserRole } from '@/types/database';

type Row = Record<string, unknown>;
const s = (v: unknown) => (v == null ? undefined : String(v));

/* ---------------- Access ---------------- */

export const PERMISSIONS = [
  'assets.edit',
  'assets.checkout',
  'assets.delete',
  'maintenance.manage',
  'people.manage',
  'locations.manage',
  'audits.run',
  'reports.view',
  'costs.view',
  'settings.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface MyAccess {
  userId: string | null;
  email: string | null;
  name: string | null;
  role: UserRole | null;
  permissions: Permission[];
  /** true when the roles migration hasn't been applied yet — the UI then defers entirely to the database. */
  legacy: boolean;
}

export async function getMyAccess(): Promise<MyAccess> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { userId: null, email: null, name: null, role: null, permissions: [], legacy: false };
  const { data: profile } = await supabase.from('profiles').select('id, role, full_name, email').eq('id', user.id).maybeSingle();
  const role = (profile?.role as UserRole) ?? null;
  const name = (profile?.full_name as string) || (user.user_metadata?.full_name as string) || null;
  const { data: perms, error } = await supabase.from('role_permissions').select('permission').eq('role', role ?? '');
  if (error) return { userId: user.id, email: user.email ?? null, name, role, permissions: [...PERMISSIONS], legacy: true };
  return {
    userId: user.id,
    email: user.email ?? null,
    name,
    role,
    permissions: role === 'ADMIN' ? [...PERMISSIONS] : ((perms || []).map((p) => p.permission) as Permission[]),
    legacy: false,
  };
}

export interface ProfileRow {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
  createdAt?: string;
}

export async function getProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase.from('profiles').select('id, email, full_name, role, created_at').order('email');
  if (error) throw error;
  return (data || []).map((r: Row) => ({ id: String(r.id), email: String(r.email), fullName: s(r.full_name), role: r.role as UserRole, createdAt: s(r.created_at) }));
}

export async function setProfileRole(id: string, role: UserRole) {
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Not allowed to change this user’s role');
}

export async function getRolePermissions(): Promise<{ role: UserRole; permission: Permission }[]> {
  const { data, error } = await supabase.from('role_permissions').select('role, permission');
  if (error) throw error;
  return (data || []) as { role: UserRole; permission: Permission }[];
}

export async function setRolePermission(role: UserRole, permission: Permission, granted: boolean) {
  const { error } = granted
    ? await supabase.from('role_permissions').insert({ role, permission })
    : await supabase.from('role_permissions').delete().eq('role', role).eq('permission', permission);
  if (error) throw error;
}

/* ---------------- Notes ---------------- */

const mapNote = (r: Row): AssetNote => ({ id: String(r.id), assetId: String(r.asset_id), authorId: String(r.author_id), authorName: s(r.author_name), body: String(r.body), createdAt: String(r.created_at) });

export async function getAssetNotes(assetId: string): Promise<AssetNote[]> {
  const { data, error } = await supabase.from('asset_notes').select('*').eq('asset_id', assetId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapNote);
}

export async function addAssetNote(assetId: string, body: string, authorName?: string): Promise<AssetNote> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('asset_notes')
    .insert({ asset_id: assetId, body, author_id: auth.user?.id, author_name: authorName })
    .select()
    .single();
  if (error) throw error;
  return mapNote(data);
}

export async function deleteAssetNote(id: string) {
  const { error } = await supabase.from('asset_notes').delete().eq('id', id);
  if (error) throw error;
}

/* ---------------- Files ---------------- */

const BUCKET = 'asset-files';
const mapFile = (r: Row): AssetFile => ({
  id: String(r.id),
  assetId: String(r.asset_id),
  storagePath: String(r.storage_path),
  fileName: String(r.file_name),
  sizeBytes: r.size_bytes == null ? undefined : Number(r.size_bytes),
  mimeType: s(r.mime_type),
  kind: (r.kind as AssetFileKind) || 'other',
  uploadedByName: s(r.uploaded_by_name),
  createdAt: String(r.created_at),
});

export async function getAssetFiles(assetId: string): Promise<AssetFile[]> {
  const { data, error } = await supabase.from('asset_files').select('*').eq('asset_id', assetId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapFile);
}

export async function uploadAssetFile(assetId: string, file: File, kind: AssetFileKind, uploadedByName?: string): Promise<AssetFile> {
  const safe = file.name.replace(/[^\w.\- ]+/g, '_');
  const path = `${assetId}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (up.error) throw up.error;
  const { data, error } = await supabase
    .from('asset_files')
    .insert({ asset_id: assetId, storage_path: path, file_name: file.name, size_bytes: file.size, mime_type: file.type, kind, uploaded_by_name: uploadedByName })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return mapFile(data);
}

export async function getAssetFileUrl(path: string, download?: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60, download ? { download } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteAssetFile(file: AssetFile) {
  const { error } = await supabase.from('asset_files').delete().eq('id', file.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([file.storagePath]);
}

/* ---------------- Audits ---------------- */

const mapAudit = (r: Row): Audit => ({
  id: String(r.id),
  name: String(r.name),
  locationId: s(r.location_id),
  locationName: s(r.location_name),
  status: r.status as Audit['status'],
  dueDate: s(r.due_date),
  notes: s(r.notes),
  expectedCount: Number(r.expected_count || 0),
  accuracy: r.accuracy == null ? undefined : Number(r.accuracy),
  startedByName: s(r.started_by_name),
  startedAt: String(r.started_at),
  closedAt: s(r.closed_at),
});
const mapScan = (r: Row): AuditScan => ({ id: String(r.id), auditId: String(r.audit_id), assetId: s(r.asset_id), code: String(r.code), result: r.result as AuditScanResult, scannedByName: s(r.scanned_by_name), scannedAt: String(r.scanned_at) });

export async function getAudits(): Promise<Audit[]> {
  const { data, error } = await supabase.from('audits').select('*').order('started_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAudit);
}

export async function getAudit(id: string): Promise<{ audit: Audit; items: AuditItem[]; scans: AuditScan[] }> {
  const [a, i, sc] = await Promise.all([
    supabase.from('audits').select('*').eq('id', id).single(),
    supabase.from('audit_items').select('*').eq('audit_id', id),
    supabase.from('audit_scans').select('*').eq('audit_id', id).order('scanned_at', { ascending: false }),
  ]);
  if (a.error) throw a.error;
  if (i.error) throw i.error;
  if (sc.error) throw sc.error;
  return {
    audit: mapAudit(a.data),
    items: (i.data || []).map((r: Row) => ({ auditId: String(r.audit_id), assetId: String(r.asset_id), assetTag: s(r.asset_tag), assetName: s(r.asset_name), serialNumber: s(r.serial_number) })),
    scans: (sc.data || []).map(mapScan),
  };
}

export async function startAudit(input: {
  name: string;
  locationId: string;
  locationName: string;
  dueDate?: string;
  startedByName?: string;
  expected: { id: string; assetTag: string; name: string; serialNumber: string }[];
}): Promise<Audit> {
  const { data, error } = await supabase
    .from('audits')
    .insert({ name: input.name, location_id: input.locationId, location_name: input.locationName, due_date: input.dueDate || null, started_by_name: input.startedByName, expected_count: input.expected.length })
    .select()
    .single();
  if (error) throw error;
  if (input.expected.length) {
    const rows = input.expected.map((a) => ({ audit_id: data.id, asset_id: a.id, asset_tag: a.assetTag, asset_name: a.name, serial_number: a.serialNumber }));
    for (let k = 0; k < rows.length; k += 500) {
      const ins = await supabase.from('audit_items').insert(rows.slice(k, k + 500));
      if (ins.error) throw ins.error;
    }
  }
  return mapAudit(data);
}

export async function recordAuditScan(input: { auditId: string; assetId?: string; code: string; result: AuditScanResult; scannedByName?: string }): Promise<AuditScan> {
  const { data, error } = await supabase
    .from('audit_scans')
    .insert({ audit_id: input.auditId, asset_id: input.assetId || null, code: input.code, result: input.result, scanned_by_name: input.scannedByName })
    .select()
    .single();
  if (error) throw error;
  return mapScan(data);
}

export async function deleteAuditScan(id: string) {
  const { error } = await supabase.from('audit_scans').delete().eq('id', id);
  if (error) throw error;
}

export async function closeAudit(id: string, accuracy: number) {
  const { error } = await supabase.from('audits').update({ status: 'closed', closed_at: new Date().toISOString(), accuracy }).eq('id', id);
  if (error) throw error;
}

/* ---------------- Handover documents ---------------- */

const mapDoc = (r: Row): HandoverDocument => ({
  id: String(r.id),
  docNo: Number(r.doc_no),
  kind: r.kind as HandoverDocument['kind'],
  employeeId: s(r.employee_id),
  employeeName: String(r.employee_name),
  employeeEmail: String(r.employee_email),
  locationName: s(r.location_name),
  items: (r.items as HandoverItem[]) || [],
  handedOverBy: s(r.handed_over_by),
  notes: s(r.notes),
  status: r.status as HandoverDocument['status'],
  createdByName: s(r.created_by_name),
  createdAt: String(r.created_at),
  signedAt: s(r.signed_at),
  signerName: s(r.signer_name),
  signature: s(r.signature),
});

export async function getHandoverDocuments(filter: { employeeId?: string; email?: string } = {}): Promise<HandoverDocument[]> {
  let q = supabase.from('handover_documents').select('*').order('created_at', { ascending: false });
  if (filter.employeeId) q = q.eq('employee_id', filter.employeeId);
  if (filter.email) q = q.ilike('employee_email', filter.email);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapDoc);
}

export async function getHandoverDocument(id: string): Promise<HandoverDocument | null> {
  const { data, error } = await supabase.from('handover_documents').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapDoc(data) : null;
}

export async function createHandoverDocument(input: {
  kind?: 'handover' | 'return';
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  locationName?: string;
  items: HandoverItem[];
  handedOverBy?: string;
  notes?: string;
  createdByName?: string;
}): Promise<HandoverDocument> {
  const { data, error } = await supabase
    .from('handover_documents')
    .insert({
      kind: input.kind || 'handover',
      employee_id: input.employeeId,
      employee_name: input.employeeName,
      employee_email: input.employeeEmail,
      location_name: input.locationName,
      items: input.items,
      handed_over_by: input.handedOverBy,
      notes: input.notes,
      created_by_name: input.createdByName,
    })
    .select()
    .single();
  if (error) throw error;
  return mapDoc(data);
}

export async function signHandoverDocument(id: string, signerName: string, signature: string) {
  const { error } = await supabase.from('handover_documents').update({ status: 'signed', signer_name: signerName, signature }).eq('id', id);
  if (error) throw error;
}

export async function voidHandoverDocument(id: string) {
  const { error } = await supabase.from('handover_documents').update({ status: 'void' }).eq('id', id);
  if (error) throw error;
}

export const signingLink = (id: string) => `${window.location.origin}/sign/${id}`;

/** Emails the signing link (edge function send-handover-email). Resolves false if the function isn't deployed. */
export async function emailHandoverLink(documentId: string): Promise<boolean> {
  const { error } = await supabase.functions.invoke('send-handover-email', { body: { documentId, appUrl: window.location.origin } });
  return !error;
}

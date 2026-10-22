import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as svc from '@/services/collabService';
import type { Permission } from '@/services/collabService';
import type { AssetFile, AssetFileKind, RepairRequestStatus, RepairUrgency, ServiceContract } from '@/types/asset';

/* ---------------- Permissions ---------------- */

export function useAccess() {
  const query = useQuery({ queryKey: ['access'], queryFn: svc.getMyAccess, staleTime: 5 * 60_000 });
  const access = query.data;
  // While loading, don't hide actions (avoids flicker); the database enforces either way.
  const can = useCallback((p: Permission) => !access || access.legacy || access.permissions.includes(p), [access]);
  return { ...query, access, can, ready: !!access || query.isError, isAdmin: access?.role === 'ADMIN' };
}

export function useProfiles(enabled = true) {
  return useQuery({ queryKey: ['profiles'], queryFn: svc.getProfiles, enabled });
}

export function useRolePermissions() {
  return useQuery({ queryKey: ['rolePermissions'], queryFn: svc.getRolePermissions });
}

export function useSetProfileRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Parameters<typeof svc.setProfileRole>[1] }) => svc.setProfileRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      qc.invalidateQueries({ queryKey: ['access'] });
    },
  });
}

export function useSetRolePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { role: Parameters<typeof svc.setRolePermission>[0]; permission: Permission; granted: boolean }) => svc.setRolePermission(v.role, v.permission, v.granted),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rolePermissions'] });
      qc.invalidateQueries({ queryKey: ['access'] });
    },
  });
}

/* ---------------- Notes & files ---------------- */

export function useAssetNotes(assetId: string) {
  return useQuery({ queryKey: ['notes', assetId], queryFn: () => svc.getAssetNotes(assetId), enabled: !!assetId, retry: false });
}

export function useAddAssetNote(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, authorName }: { body: string; authorName?: string }) => svc.addAssetNote(assetId, body, authorName),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', assetId] }),
  });
}

export function useDeleteAssetNote(assetId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.deleteAssetNote, onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', assetId] }) });
}

export function useAssetFiles(assetId: string) {
  return useQuery({ queryKey: ['files', assetId], queryFn: () => svc.getAssetFiles(assetId), enabled: !!assetId, retry: false });
}

export function useUploadAssetFile(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, kind, by }: { file: File; kind: AssetFileKind; by?: string }) => svc.uploadAssetFile(assetId, file, kind, by),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', assetId] }),
  });
}

export function useDeleteAssetFile(assetId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (f: AssetFile) => svc.deleteAssetFile(f), onSuccess: () => qc.invalidateQueries({ queryKey: ['files', assetId] }) });
}

/* ---------------- Audits ---------------- */

export function useAudits() {
  return useQuery({ queryKey: ['audits'], queryFn: svc.getAudits, retry: false });
}

export function useAuditDetail(id: string) {
  return useQuery({ queryKey: ['audits', id], queryFn: () => svc.getAudit(id), enabled: !!id });
}

export function useStartAudit() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.startAudit, onSuccess: () => qc.invalidateQueries({ queryKey: ['audits'] }) });
}

export function useRecordScan(auditId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.recordAuditScan, onSuccess: () => qc.invalidateQueries({ queryKey: ['audits', auditId] }) });
}

export function useDeleteScan(auditId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.deleteAuditScan, onSuccess: () => qc.invalidateQueries({ queryKey: ['audits', auditId] }) });
}

export function useCloseAudit(auditId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accuracy: number) => svc.closeAudit(auditId, accuracy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audits'] });
    },
  });
}

/* ---------------- Handover documents ---------------- */

export function useHandoverDocuments(filter: { employeeId?: string; email?: string }, enabled = true) {
  return useQuery({ queryKey: ['handovers', filter], queryFn: () => svc.getHandoverDocuments(filter), enabled, retry: false });
}

export function useHandoverDocument(id: string) {
  return useQuery({ queryKey: ['handover', id], queryFn: () => svc.getHandoverDocument(id), enabled: !!id });
}

export function useCreateHandover() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.createHandoverDocument, onSuccess: () => qc.invalidateQueries({ queryKey: ['handovers'] }) });
}

export function useSignHandover(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, signature }: { name: string; signature: string }) => svc.signHandoverDocument(id, name, signature),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['handover', id] });
      qc.invalidateQueries({ queryKey: ['handovers'] });
    },
  });
}

export function useVoidHandover() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.voidHandoverDocument, onSuccess: () => qc.invalidateQueries({ queryKey: ['handovers'] }) });
}

/* ---------------- Service contracts ---------------- */

export function useContracts() {
  return useQuery({ queryKey: ['contracts'], queryFn: svc.getContracts, retry: false });
}

function useContractMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export const useSaveContract = () => useContractMutation(({ input, id }: { input: svc.ContractInput; id?: string }) => svc.saveContract(input, id));
export const useDeleteContract = () => useContractMutation(svc.deleteContract);
export const useAddAssetsToContract = () => useContractMutation(({ contract, ids }: { contract: ServiceContract; ids: string[] }) => svc.addAssetsToContract(contract, ids));
export const useRemoveAssetsFromContract = () => useContractMutation(({ contract, ids }: { contract: ServiceContract; ids: string[] }) => svc.removeAssetsFromContract(contract, ids));
export const useUploadContractDocument = () => useContractMutation(({ contract, file }: { contract: ServiceContract; file: File }) => svc.uploadContractDocument(contract, file));

/* ---------------- Repair requests ---------------- */

export function useRepairRequests(enabled = true) {
  return useQuery({ queryKey: ['repairRequests'], queryFn: svc.getRepairRequests, enabled, retry: false });
}

export function useCreateRepairRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { assetId: string; issue: string; urgency: RepairUrgency }) => svc.createRepairRequest(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repairRequests'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useUpdateRepairRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; status?: RepairRequestStatus; itNote?: string }) => svc.updateRepairRequest(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repairRequests'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

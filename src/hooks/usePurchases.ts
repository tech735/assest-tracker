import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as svc from '@/services/purchaseService';
import type { InvoiceInput, ModelPhoto } from '@/services/purchaseService';
import type { PurchaseInvoice } from '@/types/asset';

/* ---------------- Purchase invoices ---------------- */

export function usePurchaseInvoices(enabled = true) {
  return useQuery({ queryKey: ['purchaseInvoices'], queryFn: svc.getPurchaseInvoices, enabled, retry: false });
}

export function useSavePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: InvoiceInput; id?: string }) => svc.savePurchaseInvoice(input, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchaseInvoices'] }),
  });
}

export function useUploadInvoiceDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoice, file }: { invoice: PurchaseInvoice; file: File }) => svc.uploadInvoiceDocument(invoice, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchaseInvoices'] }),
  });
}

export function useDeletePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.deletePurchaseInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useLinkAssetsToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoice, ids, link }: { invoice: PurchaseInvoice; ids: string[]; link: boolean }) =>
      link ? svc.linkAssetsToInvoice(invoice, ids) : svc.unlinkAssetsFromInvoice(invoice, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

/* ---------------- Product photos ---------------- */

export function useModelPhotos() {
  return useQuery({ queryKey: ['modelPhotos'], queryFn: svc.getModelPhotos, staleTime: 10 * 60_000 });
}

/** The product photo for an asset's brand + model, if one was added. */
export function useModelPhoto(asset?: { brand?: string; model?: string }): ModelPhoto | undefined {
  const { data } = useModelPhotos();
  return asset?.model ? data?.get(svc.modelKey(asset.brand, asset.model)) : undefined;
}

export function useSetModelPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { brand: string; model: string; file: File; byName?: string; previous?: ModelPhoto }) => svc.setModelPhoto(v.brand, v.model, v.file, v.byName, v.previous),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modelPhotos'] }),
  });
}

export function useRemoveModelPhoto() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.removeModelPhoto, onSuccess: () => qc.invalidateQueries({ queryKey: ['modelPhotos'] }) });
}

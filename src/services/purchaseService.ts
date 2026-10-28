// Purchase invoices (Purchases page, Receive delivery) and product photos per model.
// Tables, policies and the model-photos bucket come from supabase/migrations/0017.
import { supabase } from '@/lib/supabase';
import { chunk } from '@/lib/paging';
import { modelKey, shrinkImage } from '@/lib/image';
import { formatDate } from '@/lib/assetMeta';
import type { PurchaseInvoice } from '@/types/asset';

type Row = Record<string, unknown>;
const s = (v: unknown) => (v == null ? undefined : String(v));
const num = (v: unknown) => (v == null || v === '' ? undefined : Number(v));
const FILES = 'asset-files';
const PHOTOS = 'model-photos';
const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, '_');

/* ---------------- Purchase invoices ---------------- */

/** "Dell India · INV/0412", or the date when there's no number. */
export const invoiceLabel = (i: PurchaseInvoice) => `${i.vendor} · ${i.invoiceNumber || formatDate(i.invoiceDate)}`;

const mapInvoice = (r: Row): PurchaseInvoice => ({
  id: String(r.id),
  vendor: String(r.vendor),
  invoiceNumber: s(r.invoice_number),
  invoiceDate: String(r.invoice_date),
  subtotal: num(r.subtotal),
  taxAmount: num(r.tax_amount),
  totalAmount: num(r.total_amount),
  currency: s(r.currency) || 'INR',
  notes: s(r.notes),
  documentPath: s(r.document_path),
  documentName: s(r.document_name),
  createdAt: String(r.created_at),
});

export type InvoiceInput = Omit<PurchaseInvoice, 'id' | 'createdAt' | 'documentPath' | 'documentName'>;
const invoiceRow = (i: InvoiceInput) => ({
  vendor: i.vendor.trim(),
  invoice_number: i.invoiceNumber?.trim() || null,
  invoice_date: i.invoiceDate,
  subtotal: i.subtotal ?? null,
  tax_amount: i.taxAmount ?? null,
  total_amount: i.totalAmount ?? null,
  currency: i.currency || 'INR',
  notes: i.notes?.trim() || null,
});

/** Turns the duplicate-invoice constraint into a message people understand. */
const friendly = (e: { code?: string; message: string }) =>
  e.code === '23505' ? new Error('An invoice with this number from this vendor is already recorded.') : new Error(e.message);

export async function getPurchaseInvoices(): Promise<PurchaseInvoice[]> {
  const { data, error } = await supabase.from('purchase_invoices').select('*').order('invoice_date', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapInvoice);
}

export async function savePurchaseInvoice(input: InvoiceInput, id?: string): Promise<PurchaseInvoice> {
  const q = id ? supabase.from('purchase_invoices').update(invoiceRow(input)).eq('id', id) : supabase.from('purchase_invoices').insert(invoiceRow(input));
  const { data, error } = await q.select().single();
  if (error) throw friendly(error);
  return mapInvoice(data);
}

export async function deletePurchaseInvoice(inv: PurchaseInvoice) {
  // Linked assets stay; their link clears via ON DELETE SET NULL.
  const { error } = await supabase.from('purchase_invoices').delete().eq('id', inv.id);
  if (error) throw error;
  if (inv.documentPath) await supabase.storage.from(FILES).remove([inv.documentPath]);
}

export async function uploadInvoiceDocument(inv: PurchaseInvoice, file: File): Promise<PurchaseInvoice> {
  const path = `invoices/${inv.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const up = await supabase.storage.from(FILES).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (up.error) throw up.error;
  const { data, error } = await supabase.from('purchase_invoices').update({ document_path: path, document_name: file.name }).eq('id', inv.id).select().single();
  if (error) {
    await supabase.storage.from(FILES).remove([path]);
    throw error;
  }
  if (inv.documentPath) await supabase.storage.from(FILES).remove([inv.documentPath]);
  return mapInvoice(data);
}

/** Puts assets on an invoice; their vendor and purchase date follow it. */
export async function linkAssetsToInvoice(inv: PurchaseInvoice, assetIds: string[]) {
  const patch = { purchase_invoice_id: inv.id, vendor: inv.vendor, purchase_date: inv.invoiceDate };
  for (const part of chunk(assetIds, 150)) {
    const { error } = await supabase.from('assets').update(patch).in('id', part);
    if (error) throw error;
  }
}

export async function unlinkAssetsFromInvoice(inv: PurchaseInvoice, assetIds: string[]) {
  for (const part of chunk(assetIds, 150)) {
    const { error } = await supabase.from('assets').update({ purchase_invoice_id: null }).in('id', part).eq('purchase_invoice_id', inv.id);
    if (error) throw error;
  }
}

/* ---------------- Product photos (one per brand + model) ---------------- */

export interface ModelPhoto {
  key: string;
  brand: string;
  model: string;
  path: string;
  url: string;
  updatedByName?: string;
}

const photoUrl = (path: string) => supabase.storage.from(PHOTOS).getPublicUrl(path).data.publicUrl;

/** Every model photo, keyed by modelKey(brand, model). Empty before migration 0017. */
export async function getModelPhotos(): Promise<Map<string, ModelPhoto>> {
  const { data, error } = await supabase.from('model_photos').select('brand, model, model_key, photo_path, updated_by_name');
  if (error) return new Map();
  return new Map(
    (data || []).map((r) => [
      String(r.model_key),
      { key: String(r.model_key), brand: String(r.brand), model: String(r.model), path: String(r.photo_path), url: photoUrl(String(r.photo_path)), updatedByName: s(r.updated_by_name) },
    ]),
  );
}

export async function setModelPhoto(brand: string, model: string, file: File, byName?: string, previous?: ModelPhoto) {
  const blob = await shrinkImage(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(PHOTOS).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (up.error) throw up.error;
  const row = { brand: brand.trim(), model: model.trim(), photo_path: path, updated_by_name: byName || null };
  const { error } = previous
    ? await supabase.from('model_photos').update(row).eq('model_key', previous.key)
    : await supabase.from('model_photos').insert(row);
  if (error) {
    await supabase.storage.from(PHOTOS).remove([path]);
    throw error;
  }
  if (previous) await supabase.storage.from(PHOTOS).remove([previous.path]);
}

export async function removeModelPhoto(photo: ModelPhoto) {
  const { error } = await supabase.from('model_photos').delete().eq('model_key', photo.key);
  if (error) throw error;
  await supabase.storage.from(PHOTOS).remove([photo.path]);
}

export { modelKey };

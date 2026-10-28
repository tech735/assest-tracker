import * as React from 'react';
import { format } from 'date-fns';
import { FileText, Upload } from 'lucide-react';
import type { PurchaseInvoice } from '@/types/asset';
import { useSettings } from '@/hooks/useSupabaseData';
import { usePurchaseInvoices, useSavePurchaseInvoice, useUploadInvoiceDocument } from '@/hooks/usePurchases';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMoney } from '@/lib/assetMeta';

const toNum = (v: string) => (v.trim() === '' ? undefined : Number(v));
const money = (v: string) => v.replace(/[^\d.]/g, '');

/** Add or edit a purchase invoice (for deliveries recorded before Receive delivery existed, or fixes). */
export function InvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  invoice?: PurchaseInvoice | null;
  onSaved?: (inv: PurchaseInvoice) => void;
}) {
  const { toast } = useToast();
  const save = useSavePurchaseInvoice();
  const upload = useUploadInvoiceDocument();
  const { data: settings } = useSettings();
  const { data: invoices = [] } = usePurchaseInvoices();
  const [vendor, setVendor] = React.useState('');
  const [number, setNumber] = React.useState('');
  const [date, setDate] = React.useState('');
  const [nums, setNums] = React.useState({ subtotal: '', tax: '', total: '' });
  const [notes, setNotes] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [tried, setTried] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setVendor(invoice?.vendor || '');
    setNumber(invoice?.invoiceNumber || '');
    setDate(invoice?.invoiceDate || format(new Date(), 'yyyy-MM-dd'));
    setNums({ subtotal: invoice?.subtotal?.toString() ?? '', tax: invoice?.taxAmount?.toString() ?? '', total: invoice?.totalAmount?.toString() ?? '' });
    setNotes(invoice?.notes || '');
    setFile(null);
    setTried(false);
  }, [open, invoice]);

  const currency = invoice?.currency || settings?.currency || 'INR';
  const vendors = React.useMemo(() => [...new Set(invoices.map((i) => i.vendor))].sort(), [invoices]);
  const computed = toNum(nums.subtotal) != null ? (toNum(nums.subtotal) || 0) + (toNum(nums.tax) || 0) : undefined;
  const invalid = !vendor.trim() || !date;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (invalid) return;
    try {
      let saved = await save.mutateAsync({
        id: invoice?.id,
        input: {
          vendor,
          invoiceNumber: number,
          invoiceDate: date,
          subtotal: toNum(nums.subtotal),
          taxAmount: toNum(nums.tax),
          totalAmount: toNum(nums.total) ?? computed,
          currency,
          notes,
        },
      });
      if (file) saved = await upload.mutateAsync({ invoice: saved, file });
      toast({ title: invoice ? 'Invoice updated' : 'Invoice added', description: invoice ? undefined : 'Next, choose the assets bought on it.' });
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      toast({ title: 'Couldn’t save the invoice', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[560px]">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{invoice ? 'Edit invoice' : 'Add purchase invoice'}</DialogTitle>
            <DialogDescription>For new stock, “Receive delivery” records the invoice and the assets together.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="i-vendor">Vendor</Label>
              <Input id="i-vendor" list="i-vendors" value={vendor} onChange={(e) => setVendor(e.target.value)} aria-invalid={tried && !vendor.trim()} />
              <datalist id="i-vendors">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="i-number">Tax invoice no.</Label>
              <Input id="i-number" value={number} onChange={(e) => setNumber(e.target.value)} className="font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label>Invoice date</Label>
              <DatePicker value={date} onChange={setDate} className="h-[38px] w-full" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="i-sub">Before GST</Label>
              <Input id="i-sub" inputMode="decimal" value={nums.subtotal} onChange={(e) => setNums((n) => ({ ...n, subtotal: money(e.target.value) }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="i-tax">GST</Label>
              <Input id="i-tax" inputMode="decimal" value={nums.tax} onChange={(e) => setNums((n) => ({ ...n, tax: money(e.target.value) }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="i-total">Total</Label>
              <Input id="i-total" inputMode="decimal" value={nums.total} onChange={(e) => setNums((n) => ({ ...n, total: money(e.target.value) }))} placeholder={computed != null ? String(computed) : ''} />
            </div>
          </div>
          {computed != null && !nums.total && <p className="-mt-2 text-xs text-muted-foreground">Total will be {formatMoney(computed, currency)}.</p>}
          <div className="grid gap-1.5">
            <Label htmlFor="i-notes">Notes</Label>
            <Textarea id="i-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="PO number, delivery challan…" />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 hover:bg-subtle">
            {file || invoice?.documentName ? <FileText className="h-5 w-5 shrink-0 text-muted-foreground" /> : <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />}
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-medium">{file?.name || invoice?.documentName || 'Attach the tax invoice (PDF or photo)'}</span>
              <span className="block text-xs text-muted-foreground">{file ? 'Uploads when you save' : invoice?.documentName ? 'Choose a file to replace it' : 'Optional · up to 20 MB'}</span>
            </span>
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending || upload.isPending}>{invoice ? 'Save changes' : 'Add invoice'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

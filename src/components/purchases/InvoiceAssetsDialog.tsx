import * as React from 'react';
import type { PurchaseInvoice } from '@/types/asset';
import { useAssets } from '@/hooks/useSupabaseData';
import { useLinkAssetsToInvoice, usePurchaseInvoices } from '@/hooks/usePurchases';
import { invoiceLabel } from '@/services/purchaseService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchField } from '@/components/app/controls';
import { AssetThumb, Pill, StatusBadge } from '@/components/app/primitives';
import { displayLocation } from '@/lib/assetMeta';
import { cn } from '@/lib/utils';

const SHOW = 200;

/** Pick the assets bought on an invoice. Ticking links them (vendor and purchase date follow); unticking unlinks. */
export function InvoiceAssetsDialog({ invoice, open, onOpenChange }: { invoice: PurchaseInvoice | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const { data: assets = [] } = useAssets();
  const { data: invoices = [] } = usePurchaseInvoices();
  const link = useLinkAssetsToInvoice();
  const [q, setQ] = React.useState('');
  const [onlyFree, setOnlyFree] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const linked = React.useMemo(() => (invoice ? new Set(assets.filter((a) => a.purchaseInvoiceId === invoice.id).map((a) => a.id)) : new Set<string>()), [assets, invoice]);
  React.useEffect(() => {
    if (open) {
      setSelected(new Set(linked));
      setQ('');
      setOnlyFree(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice?.id]);

  const labelOf = React.useMemo(() => new Map(invoices.map((i) => [i.id, invoiceLabel(i)])), [invoices]);
  const list = React.useMemo(() => {
    if (!invoice) return [];
    const term = q.trim().toLowerCase();
    return assets
      .filter((a) => !onlyFree || !a.purchaseInvoiceId || linked.has(a.id))
      .filter((a) => !term || [a.name, a.assetTag, a.serialNumber, a.brand, a.model, a.vendor].some((v) => v?.toLowerCase().includes(term)))
      .sort((a, b) => Number(linked.has(b.id)) - Number(linked.has(a.id)) || a.assetTag.localeCompare(b.assetTag, undefined, { numeric: true }));
  }, [assets, invoice, q, onlyFree, linked]);

  if (!invoice) return null;
  const toAdd = [...selected].filter((id) => !linked.has(id));
  const toRemove = [...linked].filter((id) => !selected.has(id));
  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const save = async () => {
    try {
      if (toAdd.length) await link.mutateAsync({ invoice, ids: toAdd, link: true });
      if (toRemove.length) await link.mutateAsync({ invoice, ids: toRemove, link: false });
      toast({ title: 'Invoice items updated', description: `${selected.size} asset${selected.size === 1 ? '' : 's'} on ${invoiceLabel(invoice)}.` });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Couldn’t update the items', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-[640px]">
        <DialogHeader className="space-y-1 px-6 pb-3 pt-5">
          <DialogTitle>Assets on this invoice</DialogTitle>
          <DialogDescription>{invoiceLabel(invoice)}. Ticked assets take this vendor and the invoice date as their purchase date.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y bg-subtle px-6 py-2.5">
          <SearchField value={q} onChange={setQ} placeholder="Search tag, serial, model or vendor" className="min-w-[200px] flex-1" autoFocus />
          <label className="flex items-center gap-2 text-[13px]">
            <Switch checked={onlyFree} onCheckedChange={setOnlyFree} /> Only without an invoice
          </label>
        </div>
        <ul className="min-h-[200px] flex-1 divide-y overflow-y-auto">
          {list.slice(0, SHOW).map((a) => {
            const on = selected.has(a.id);
            const elsewhere = a.purchaseInvoiceId && a.purchaseInvoiceId !== invoice.id ? labelOf.get(a.purchaseInvoiceId) : undefined;
            return (
              <li key={a.id}>
                <label className={cn('flex cursor-pointer items-center gap-3 px-6 py-2.5 hover:bg-subtle', on && 'bg-primary/[0.04]')}>
                  <Checkbox checked={on} onCheckedChange={(c) => toggle(a.id, c === true)} aria-label={`Put ${a.assetTag} on this invoice`} />
                  <AssetThumb category={a.category} asset={a} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="font-mono">{a.assetTag}</span> · S/N {a.serialNumber || '—'} · {a.vendor || displayLocation(a.location)}
                    </span>
                  </span>
                  {elsewhere && <Pill tone={on ? 'warning' : 'quiet'} dot={false} className="hidden sm:inline-flex">{on ? 'Moves from' : 'On'} {elsewhere}</Pill>}
                  <StatusBadge status={a.status} className="hidden md:inline-flex" />
                </label>
              </li>
            );
          })}
          {list.length === 0 && <li className="px-6 py-10 text-center text-sm text-muted-foreground">No matching assets.</li>}
          {list.length > SHOW && <li className="px-6 py-3 text-center text-xs text-muted-foreground">Showing {SHOW} of {list.length} — search to narrow down.</li>}
        </ul>
        <DialogFooter className="items-center border-t px-6 py-3">
          <p className="mr-auto text-[13px] text-muted-foreground">
            {selected.size} selected
            {toAdd.length || toRemove.length ? ` · ${toAdd.length ? `+${toAdd.length}` : ''}${toAdd.length && toRemove.length ? ' ' : ''}${toRemove.length ? `−${toRemove.length}` : ''}` : ''}
          </p>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={save} disabled={!toAdd.length && !toRemove.length} loading={link.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

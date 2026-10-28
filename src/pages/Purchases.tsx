import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { FileText, ListChecks, MoreHorizontal, PackagePlus, Paperclip, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import type { Asset, PurchaseInvoice } from '@/types/asset';
import { useAssets, useSettings } from '@/hooks/useSupabaseData';
import { useAccess } from '@/hooks/useCollab';
import { useDeletePurchaseInvoice, usePurchaseInvoices } from '@/hooks/usePurchases';
import { getAssetFileUrl } from '@/services/collabService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FilterChip, SearchField } from '@/components/app/controls';
import { AssetThumb, EmptyState, IconBubble, KeyValue, PageHeader, PageLoader, StatusBadge } from '@/components/app/primitives';
import { NoAccess } from '@/components/RequirePage';
import { InvoiceDialog } from '@/components/purchases/InvoiceDialog';
import { InvoiceAssetsDialog } from '@/components/purchases/InvoiceAssetsDialog';
import { displayLocation, formatDate, formatMoney } from '@/lib/assetMeta';

const ALL = 'all';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Purchases() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { can, ready } = useAccess();
  const allowed = can('costs.view') || can('assets.edit');
  const { data: invoices = [], isLoading, error } = usePurchaseInvoices(allowed);
  const { data: assets = [] } = useAssets();
  const { data: settings } = useSettings();
  const del = useDeletePurchaseInvoice();
  const canEdit = can('assets.edit');
  const currency: string = settings?.currency || 'INR';

  const [q, setQ] = useState('');
  const [vendors, setVendors] = useState<string[]>([]);
  const [year, setYear] = useState(ALL);
  const [month, setMonth] = useState(ALL);
  const [editing, setEditing] = useState<PurchaseInvoice | null | undefined>(undefined); // undefined = closed, null = new
  const [picking, setPicking] = useState<PurchaseInvoice | null>(null);
  const [deleting, setDeleting] = useState<PurchaseInvoice | null>(null);

  const itemsOf = useMemo(() => {
    const m = new Map<string, Asset[]>();
    assets.forEach((a) => a.purchaseInvoiceId && m.set(a.purchaseInvoiceId, [...(m.get(a.purchaseInvoiceId) || []), a]));
    return m;
  }, [assets]);

  const vendorOptions = useMemo(() => {
    const m = new Map<string, number>();
    invoices.forEach((i) => m.set(i.vendor, (m.get(i.vendor) || 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([v, n]) => ({ value: v, label: v, count: n }));
  }, [invoices]);
  const years = useMemo(() => [...new Set(invoices.map((i) => i.invoiceDate.slice(0, 4)))].sort().reverse(), [invoices]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return invoices.filter(
      (i) =>
        (!vendors.length || vendors.includes(i.vendor)) &&
        (year === ALL || i.invoiceDate.startsWith(year)) &&
        (month === ALL || i.invoiceDate.slice(5, 7) === month) &&
        (!term || [i.vendor, i.invoiceNumber, i.notes].some((v) => v?.toLowerCase().includes(term)) || (itemsOf.get(i.id) || []).some((a) => [a.assetTag, a.serialNumber].some((v) => v?.toLowerCase().includes(term)))),
    );
  }, [invoices, vendors, year, month, q, itemsOf]);

  // Grouped by month, newest first (the list is already sorted by invoice date).
  const groups = useMemo(() => {
    const m = new Map<string, PurchaseInvoice[]>();
    filtered.forEach((i) => {
      const k = i.invoiceDate.slice(0, 7);
      m.set(k, [...(m.get(k) || []), i]);
    });
    return [...m.entries()];
  }, [filtered]);
  const sum = (list: PurchaseInvoice[]) => list.reduce((s, i) => s + (i.totalAmount || 0), 0);

  const viewing = invoices.find((i) => i.id === params.get('invoice')) || null;
  const view = (i: PurchaseInvoice | null) => setParams(i ? { invoice: i.id } : {}, { replace: true });

  const openDocument = async (i: PurchaseInvoice) => {
    if (!i.documentPath) return;
    try {
      window.open(await getAssetFileUrl(i.documentPath), '_blank', 'noopener');
    } catch (e) {
      toast({ title: 'Couldn’t open the invoice', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  if (!ready || (allowed && isLoading)) return <PageLoader label="Loading purchases" />;
  if (!allowed) return <NoAccess />;
  if (error)
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState icon={Receipt} title="Purchases aren’t enabled yet" description="Apply migration 0017_purchases_model_photos.sql in the Supabase SQL editor, then reload." />
      </div>
    );

  const menu = (i: PurchaseInvoice) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label="Invoice actions" onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {i.documentPath && <DropdownMenuItem onSelect={() => openDocument(i)}><FileText /> Open invoice</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => setPicking(i)}><ListChecks /> Choose assets</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setEditing(i)}><Pencil /> Edit</DropdownMenuItem>
        {can('assets.delete') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setDeleting(i)} className="text-destructive-strong focus:text-destructive-strong [&_svg]:text-destructive-strong"><Trash2 /> Delete</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="Purchases"
        description={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'} · tax invoices for every delivery, by vendor and month`}
        actions={
          canEdit && (
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}><Plus /> <span className="hidden sm:inline">Add invoice</span><span className="sm:hidden">Invoice</span></Button>
              <Button asChild><Link to="/assets/receive"><PackagePlus /> <span className="hidden sm:inline">Receive delivery</span><span className="sm:hidden">Receive</span></Link></Button>
            </>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3">
        <SearchField value={q} onChange={setQ} placeholder="Vendor, invoice no., tag or serial" className="w-full sm:w-[260px]" />
        <FilterChip label="Vendor" options={vendorOptions} selected={vendors} onChange={setVendors} searchable />
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-8 w-[120px] text-[13px]" aria-label="Year"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All years</SelectItem>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-8 w-[140px] text-[13px]" aria-label="Month"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All months</SelectItem>
            {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="ml-auto text-[13px] text-muted-foreground">
          {filtered.length} invoice{filtered.length === 1 ? '' : 's'} · <span className="font-medium text-foreground">{formatMoney(sum(filtered), currency)}</span>
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={Receipt}
            title="No purchase invoices yet"
            description="Use “Receive delivery” when new stock arrives, or add an invoice for things you bought earlier and link its assets."
            action={canEdit && <Button asChild><Link to="/assets/receive"><PackagePlus /> Receive delivery</Link></Button>}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={Receipt} title="No invoices match" description="Try another vendor, month or search." />
        </div>
      ) : (
        groups.map(([key, list]) => (
          <section key={key} className="overflow-hidden rounded-xl border bg-card">
            <header className="flex items-center gap-3 border-b bg-subtle px-4 py-2.5">
              <h2 className="flex-1 text-sm font-semibold">{format(parseISO(`${key}-01`), 'MMMM yyyy')}</h2>
              <span className="text-xs text-muted-foreground">{list.length} invoice{list.length === 1 ? '' : 's'} · {formatMoney(sum(list), currency)}</span>
            </header>
            <ul className="divide-y">
              {list.map((i) => {
                const n = itemsOf.get(i.id)?.length || 0;
                return (
                  <li key={i.id}>
                    <div role="button" tabIndex={0} onClick={() => view(i)} onKeyDown={(e) => e.key === 'Enter' && view(i)} className="flex cursor-pointer items-center gap-3 px-4 py-3 outline-none hover:bg-subtle focus-visible:bg-subtle">
                      <IconBubble icon={i.documentPath ? FileText : Receipt} tone={i.documentPath ? 'info' : 'quiet'} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{i.vendor}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {i.invoiceNumber ? <span className="font-mono">{i.invoiceNumber}</span> : 'No invoice no.'} · {formatDate(i.invoiceDate)} · {n} item{n === 1 ? '' : 's'}
                          {!i.documentPath && <span className="text-warning-strong"> · PDF missing</span>}
                        </p>
                      </div>
                      <span className="hidden text-sm font-medium sm:inline">{formatMoney(i.totalAmount, i.currency)}</span>
                      {canEdit && menu(i)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <Sheet open={!!viewing} onOpenChange={(o) => !o && view(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
          {viewing && (
            <InvoiceDetails
              invoice={viewing}
              items={itemsOf.get(viewing.id) || []}
              canEdit={canEdit}
              onEdit={() => setEditing(viewing)}
              onPick={() => setPicking(viewing)}
              onOpenDocument={() => openDocument(viewing)}
            />
          )}
        </SheetContent>
      </Sheet>

      <InvoiceDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} invoice={editing} onSaved={(i) => !editing && setPicking(i)} />
      <InvoiceAssetsDialog invoice={picking} open={!!picking} onOpenChange={(o) => !o && setPicking(null)} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.vendor}{deleting?.invoiceNumber ? ` · ${deleting.invoiceNumber}` : ''} is removed with its PDF. The assets stay; they’re just no longer linked to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await del.mutateAsync(deleting);
                  if (viewing?.id === deleting.id) view(null);
                  toast({ title: 'Invoice deleted' });
                } catch (e) {
                  toast({ title: 'Couldn’t delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InvoiceDetails({
  invoice: i,
  items,
  canEdit,
  onEdit,
  onPick,
  onOpenDocument,
}: {
  invoice: PurchaseInvoice;
  items: Asset[];
  canEdit: boolean;
  onEdit: () => void;
  onPick: () => void;
  onOpenDocument: () => void;
}) {
  const sorted = [...items].sort((a, b) => a.assetTag.localeCompare(b.assetTag, undefined, { numeric: true }));
  return (
    <>
      <div className="space-y-4 border-b px-6 pb-4 pt-5">
        <div className="flex items-center gap-3.5 pr-10">
          <IconBubble icon={Receipt} tone="info" size="lg" />
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg">{i.vendor}</SheetTitle>
            <p className="truncate text-xs text-muted-foreground">
              {i.invoiceNumber ? <span className="font-mono">{i.invoiceNumber}</span> : 'No invoice no.'} · {formatDate(i.invoiceDate)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {i.documentPath ? (
            <Button size="sm" variant="secondary" onClick={onOpenDocument}><FileText /> Invoice PDF</Button>
          ) : (
            canEdit && <Button size="sm" variant="secondary" onClick={onEdit}><Paperclip /> Attach PDF</Button>
          )}
          {canEdit && <Button size="sm" variant="secondary" onClick={onPick}><ListChecks /> Choose assets</Button>}
          {canEdit && <Button size="sm" variant="secondary" onClick={onEdit}><Pencil /> Edit</Button>}
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
        <div className="space-y-3">
          {i.subtotal != null && <KeyValue label="Before GST">{formatMoney(i.subtotal, i.currency)}</KeyValue>}
          {i.taxAmount != null && <KeyValue label="GST">{formatMoney(i.taxAmount, i.currency)}</KeyValue>}
          <KeyValue label="Total">{formatMoney(i.totalAmount, i.currency)}</KeyValue>
          {i.notes && <p className="whitespace-pre-wrap rounded-lg bg-subtle px-3 py-2 text-[13px] text-muted-foreground">{i.notes}</p>}
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">
            Items <span className="font-normal text-muted-foreground">· {sorted.length}</span>
          </p>
          {sorted.length ? (
            sorted.map((a) => (
              <Link key={a.id} to={`/assets/${a.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-subtle">
                <AssetThumb category={a.category} asset={a} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    <span className="font-mono">{a.assetTag}</span> · S/N {a.serialNumber} · {a.assignedTo || displayLocation(a.location)}
                  </span>
                </span>
                <StatusBadge status={a.status} />
              </Link>
            ))
          ) : (
            <p className="text-[13px] text-muted-foreground">None linked yet{canEdit ? ' — use “Choose assets”.' : '.'}</p>
          )}
        </div>
      </div>
    </>
  );
}

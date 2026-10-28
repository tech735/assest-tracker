import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { addMonths, format, parseISO, subDays } from 'date-fns';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, ImagePlus, PackagePlus, Plus, Printer, Receipt, RotateCcw, ScanLine, Trash2, Upload } from 'lucide-react';
import type { Asset, AssetCategory, AssetCondition, PurchaseInvoice } from '@/types/asset';
import { useAssets, useLocations, useSettings } from '@/hooks/useSupabaseData';
import { useAccess } from '@/hooks/useCollab';
import { useModelPhoto, usePurchaseInvoices, useSetModelPhoto } from '@/hooks/usePurchases';
import { createAsset } from '@/services/supabaseService';
import { savePurchaseInvoice, uploadInvoiceDocument } from '@/services/purchaseService';
import { useShell } from '@/components/layout/AppShell';
import { NoAccess } from '@/components/RequirePage';
import { LabelsDialog } from '@/components/assets/LabelDialog';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetThumb, PageHeader, PageLoader, ProgressBar, SectionCard } from '@/components/app/primitives';
import { displayLocation, formatDate, formatMoney, titleCase } from '@/lib/assetMeta';
import { modelKey } from '@/lib/image';
import { mapLimit } from '@/lib/paging';
import { cn } from '@/lib/utils';

type Step = 'details' | 'items' | 'serials' | 'done';
interface Line {
  id: string;
  category: string;
  brand: string;
  model: string;
  unitPrice: string;
  qty: string;
  condition: AssetCondition;
  /** false for bags, mice and other items without a serial: the asset tag is used instead. */
  serials: boolean;
}
type Unit = { line: Line; index: number; serial: string };
type Result = { unit: Unit; asset?: Asset; error?: string };

// Local calendar dates: toISOString() would shift to UTC and give the previous day in India.
const today = () => format(new Date(), 'yyyy-MM-dd');
const newLine = (): Line => ({ id: crypto.randomUUID(), category: '', brand: '', model: '', unitPrice: '', qty: '1', condition: 'new', serials: true });
const qtyOf = (l: Line) => Math.max(0, Math.min(200, Number(l.qty) || 0));
const priceOf = (l: Line) => (l.unitPrice.trim() === '' ? undefined : Number(l.unitPrice));
const nameOf = (l: Line) => `${l.brand} ${l.model}`.replace(/\s+/g, ' ').trim();
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function ReceiveDelivery() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { openScanner } = useShell();
  const { can, access, ready } = useAccess();
  const { data: assets = [], isLoading } = useAssets();
  const { data: locations = [] } = useLocations();
  const { data: settings } = useSettings();
  const { data: invoices = [] } = usePurchaseInvoices();
  const currency: string = settings?.currency || 'INR';

  const [step, setStep] = useState<Step>('details');
  const [tried, setTried] = useState(false);
  // Delivery details (entered once)
  const [vendor, setVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [locationId, setLocationId] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [gst, setGst] = useState('18');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  // Items and serials
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [serials, setSerials] = useState<Record<string, string[]>>({});
  const serialRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Saving
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [labelsOpen, setLabelsOpen] = useState(false);

  const categories = useMemo(() => {
    const all = [...(settings?.categories || []), ...assets.map((a) => a.category)].filter(Boolean).map((c: string) => c.toLowerCase());
    return [...new Set(all)].sort();
  }, [settings, assets]);
  const vendors = useMemo(() => [...new Set([...invoices.map((i) => i.vendor), ...assets.map((a) => a.vendor)].filter(Boolean) as string[])].sort(), [invoices, assets]);
  const brands = useMemo(() => [...new Set(assets.map((a) => a.brand).filter(Boolean))].sort(), [assets]);
  const models = useMemo(() => [...new Set(assets.map((a) => a.model).filter(Boolean))].sort(), [assets]);
  const knownSerials = useMemo(() => new Map(assets.map((a) => [a.serialNumber?.trim().toLowerCase(), a.assetTag])), [assets]);
  const defaultLocation = locations.find((l) => l.type === 'warehouse') || locations[0];
  const location = locations.find((l) => l.id === (locationId || defaultLocation?.id));

  if (isLoading || !ready) return <PageLoader label="Loading" />;
  if (!can('assets.edit')) return <NoAccess />;

  /* ---------- derived ---------- */
  const units = lines.reduce((n, l) => n + qtyOf(l), 0);
  const subtotal = round2(lines.reduce((sum, l) => sum + qtyOf(l) * (priceOf(l) || 0), 0));
  const gstPct = Number(gst) || 0;
  const tax = round2((subtotal * gstPct) / 100);
  const total = round2(subtotal + tax);
  const months = Math.max(0, Math.min(120, Number(warrantyMonths) || 0));
  const warrantyEnd = months && invoiceDate ? format(subDays(addMonths(parseISO(invoiceDate), months), 1), 'yyyy-MM-dd') : undefined;
  const duplicateInvoice = invoiceNumber.trim()
    ? invoices.find((i) => i.vendor.trim().toLowerCase() === vendor.trim().toLowerCase() && i.invoiceNumber?.trim().toLowerCase() === invoiceNumber.trim().toLowerCase())
    : undefined;

  const detailsOk = !!vendor.trim() && !!invoiceDate && !!location && !duplicateInvoice;
  const lineProblem = (l: Line) =>
    !l.category ? 'Pick a type' : !l.model.trim() ? 'Enter the model' : qtyOf(l) < 1 ? 'Quantity of at least 1' : priceOf(l) != null && (Number.isNaN(priceOf(l)) || priceOf(l)! < 0) ? 'Check the price' : null;
  const itemsOk = lines.length > 0 && lines.every((l) => !lineProblem(l));

  // Flat list of every unit that needs a serial, in order (Enter moves through it).
  const serialUnits: Unit[] = lines.filter((l) => l.serials).flatMap((l) => Array.from({ length: qtyOf(l) }, (_, index) => ({ line: l, index, serial: serials[l.id]?.[index] ?? '' })));
  const trimmed = serialUnits.map((u) => u.serial.trim().toLowerCase());
  const serialIssue = (i: number) => {
    const v = trimmed[i];
    if (!v) return null;
    if (trimmed.indexOf(v) !== i) return 'Duplicate in this delivery';
    const tag = knownSerials.get(v);
    return tag ? `Already registered as ${tag}` : null;
  };
  const filled = trimmed.filter(Boolean).length;
  const serialsOk = serialUnits.every((_, i) => trimmed[i] && !serialIssue(i));

  /* ---------- actions ---------- */
  const patchLine = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const setSerial = (u: Unit, value: string) =>
    setSerials((s) => {
      const arr = [...(s[u.line.id] || [])];
      arr[u.index] = value;
      return { ...s, [u.line.id]: arr };
    });
  // After the step renders or the camera dialog closes, focus has to wait a tick.
  const focusSerial = (i: number) => setTimeout(() => serialRefs.current[i]?.focus(), 30);

  const next = () => {
    setTried(true);
    if (step === 'details' && detailsOk) {
      setTried(false);
      setStep('items');
    } else if (step === 'items' && itemsOk) {
      setTried(false);
      if (serialUnits.length) {
        setStep('serials');
        focusSerial(0);
      } else void save();
    }
  };

  const unitsToCreate = (): Unit[] =>
    lines.flatMap((l) => Array.from({ length: qtyOf(l) }, (_, index) => ({ line: l, index, serial: l.serials ? (serials[l.id]?.[index] ?? '').trim() : '' })));

  const createUnits = async (list: Unit[], inv: PurchaseInvoice) => {
    setProgress({ done: 0, total: list.length });
    let done = 0;
    const out = await mapLimit(list, 3, async (unit): Promise<Result> => {
      const l = unit.line;
      try {
        const asset = await createAsset({
          assetTag: '', // generated by the database
          serialNumber: unit.serial, // blank → the database uses the asset tag
          name: nameOf(l),
          brand: l.brand.trim(),
          model: l.model.trim(),
          category: l.category as AssetCategory,
          condition: l.condition,
          status: 'available',
          location: location!.name,
          locationId: location!.id,
          purchaseDate: inv.invoiceDate,
          purchaseCost: priceOf(l),
          vendor: inv.vendor,
          warrantyStart: warrantyEnd ? inv.invoiceDate : undefined,
          warrantyEnd,
          purchaseInvoiceId: inv.id,
        });
        return { unit, asset };
      } catch (e) {
        return { unit, error: e instanceof Error ? e.message : 'Failed' };
      } finally {
        setProgress({ done: ++done, total: list.length });
      }
    });
    ['assets', 'locations', 'dashboardStats', 'purchaseInvoices'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    return out;
  };

  const save = async () => {
    setTried(true);
    if (!detailsOk || !itemsOk || !serialsOk) return;
    try {
      let inv = await savePurchaseInvoice({
        vendor,
        invoiceNumber,
        invoiceDate,
        subtotal: subtotal || undefined,
        taxAmount: subtotal ? tax : undefined,
        totalAmount: subtotal ? total : undefined,
        currency,
        notes,
      });
      if (file) {
        try {
          inv = await uploadInvoiceDocument(inv, file);
        } catch (e) {
          toast({ title: 'Invoice PDF didn’t upload', description: `${e instanceof Error ? e.message : ''} You can attach it later from Purchases.`, variant: 'destructive' });
        }
      }
      setInvoice(inv);
      setStep('done');
      const out = await createUnits(unitsToCreate(), inv);
      setResults(out);
      const failed = out.filter((r) => r.error).length;
      toast(
        failed
          ? { title: `${out.length - failed} of ${out.length} added`, description: 'Some items failed — retry them below.', variant: 'destructive' }
          : { title: `${out.length} asset${out.length === 1 ? '' : 's'} added`, description: `From ${inv.vendor}${inv.invoiceNumber ? ` · ${inv.invoiceNumber}` : ''}` },
      );
    } catch (e) {
      setProgress(null);
      toast({ title: 'Couldn’t save the delivery', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    }
  };

  const retryFailed = async () => {
    if (!invoice) return;
    const failed = results.filter((r) => r.error).map((r) => r.unit);
    const again = await createUnits(failed, invoice);
    setResults((rs) => [...rs.filter((r) => !r.error), ...again]);
  };

  const reset = () => {
    setStep('details');
    setTried(false);
    setInvoiceNumber('');
    setNotes('');
    setFile(null);
    setLines([newLine()]);
    setSerials({});
    setProgress(null);
    setInvoice(null);
    setResults([]);
  };

  /* ---------- views ---------- */
  const stepper = (
    <ol className="flex items-center gap-2 text-[13px]">
      {(['details', 'items', 'serials'] as const).map((s, i) => {
        const order = ['details', 'items', 'serials', 'done'];
        const current = step === s;
        const done = order.indexOf(step) > i;
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className={cn('h-px w-6 sm:w-10', done || current ? 'bg-primary' : 'bg-border')} />}
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', current ? 'bg-primary text-primary-foreground' : done ? 'bg-primary/15 text-link' : 'bg-muted text-muted-foreground')}>
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('hidden sm:inline', current ? 'font-medium' : 'text-muted-foreground')}>{['Delivery', 'Items', 'Serial numbers'][i]}</span>
          </li>
        );
      })}
    </ol>
  );

  if (step === 'done') {
    const created = results.filter((r) => r.asset).map((r) => r.asset!);
    const failed = results.filter((r) => r.error);
    const running = !!progress && progress.done < progress.total;
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader breadcrumb={[{ label: 'Assets', to: '/assets' }, { label: 'Receive delivery' }]} title="Receive delivery" />
        <SectionCard title={running || !progress ? 'Adding assets…' : failed.length ? 'Delivery partly added' : 'Delivery received'}>
          {progress && (
            <div className="space-y-1.5">
              <ProgressBar value={progress.total ? progress.done / progress.total : 1} tone={failed.length && !running ? 'warning' : 'success'} />
              <p className="text-[13px] text-muted-foreground">
                {progress.done} of {progress.total} saved{invoice ? ` · ${invoice.vendor}${invoice.invoiceNumber ? ` · ${invoice.invoiceNumber}` : ''}` : ''}
              </p>
            </div>
          )}
          {!running && progress && (
            <>
              {failed.length > 0 && (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-[13px] text-destructive-strong">
                  <p className="font-medium">{failed.length} not added</p>
                  <ul className="mt-1 space-y-0.5">
                    {failed.map((r, i) => (
                      <li key={i}>{nameOf(r.unit.line)}{r.unit.serial ? ` · S/N ${r.unit.serial}` : ''} — {r.error}</li>
                    ))}
                  </ul>
                  <Button size="sm" variant="secondary" className="mt-2" onClick={retryFailed}><RotateCcw /> Retry {failed.length}</Button>
                </div>
              )}
              {created.length > 0 && (
                <ul className="mt-4 divide-y rounded-lg border">
                  {created.map((a) => (
                    <li key={a.id}>
                      <Link to={`/assets/${a.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-subtle">
                        <AssetThumb category={a.category} asset={a} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.name}</span>
                        <span className="font-mono text-xs">{a.assetTag}</span>
                        <span className="hidden w-40 truncate text-right font-mono text-xs text-muted-foreground sm:inline">{a.serialNumber === a.assetTag ? 'no serial' : a.serialNumber}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {created.length > 0 && <Button onClick={() => setLabelsOpen(true)}><Printer /> Print {created.length} label{created.length === 1 ? '' : 's'}</Button>}
                {invoice && <Button variant="secondary" asChild><Link to={`/purchases?invoice=${invoice.id}`}><Receipt /> Open invoice</Link></Button>}
                <Button variant="secondary" onClick={reset}><PackagePlus /> Receive another</Button>
              </div>
            </>
          )}
        </SectionCard>
        <LabelsDialog assets={created} open={labelsOpen} onOpenChange={setLabelsOpen} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Assets', to: '/assets' }, { label: 'Receive delivery' }]}
        title="Receive delivery"
        description="Enter the invoice once, list what arrived, then scan the serial numbers."
        actions={stepper}
      />

      {step === 'details' && (
        <SectionCard title="Delivery and invoice">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="d-vendor">Vendor</Label>
              <Input id="d-vendor" list="d-vendors" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Dell India" aria-invalid={tried && !vendor.trim()} autoFocus />
              <datalist id="d-vendors">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-number">Tax invoice no.</Label>
              <Input id="d-number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g. INV/2026-27/0412" className="font-mono" aria-invalid={!!duplicateInvoice} />
              {duplicateInvoice && (
                <p className="text-xs text-destructive-strong">
                  Already recorded on {formatDate(duplicateInvoice.invoiceDate)} — <Link to={`/purchases?invoice=${duplicateInvoice.id}`} className="underline">open it</Link>.
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Invoice date</Label>
              <DatePicker value={invoiceDate} onChange={setInvoiceDate} className="h-[38px] w-full" />
            </div>
            <div className="grid gap-1.5">
              <Label>Received at</Label>
              <Select value={location?.id || ''} onValueChange={setLocationId}>
                <SelectTrigger aria-invalid={tried && !location}><SelectValue placeholder="Where is it going?" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{displayLocation(l.name)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-warranty">Warranty (months)</Label>
              <Input id="d-warranty" inputMode="numeric" value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value.replace(/[^\d]/g, ''))} placeholder="12" />
              <p className="text-xs text-muted-foreground">{warrantyEnd ? `Covered until ${formatDate(warrantyEnd)}` : 'No warranty recorded'}</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-gst">GST %</Label>
              <Input id="d-gst" inputMode="decimal" value={gst} onChange={(e) => setGst(e.target.value.replace(/[^\d.]/g, ''))} placeholder="18" />
            </div>
          </div>
          <div className="mt-4 grid gap-1.5">
            <Label htmlFor="d-notes">Notes</Label>
            <Textarea id="d-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="PO number, delivery challan, who received it…" />
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 hover:bg-subtle">
            {file ? <FileText className="h-5 w-5 shrink-0 text-muted-foreground" /> : <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />}
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-medium">{file?.name || 'Attach the tax invoice (PDF or photo)'}</span>
              <span className="block text-xs text-muted-foreground">{file ? 'Uploads when you save' : 'Optional · up to 20 MB · you can add it later'}</span>
            </span>
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </SectionCard>
      )}

      {step === 'items' && (
        <div className="space-y-3">
          <datalist id="d-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
          <datalist id="d-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
          {lines.map((l, i) => (
            <LineCard
              key={l.id}
              line={l}
              index={i}
              categories={categories}
              currency={currency}
              problem={tried ? lineProblem(l) : null}
              canRemove={lines.length > 1}
              onChange={(p) => patchLine(l.id, p)}
              onRemove={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
              byName={access?.name || undefined}
            />
          ))}
          <Button variant="secondary" onClick={() => setLines((ls) => [...ls, { ...newLine(), category: ls[ls.length - 1]?.category || '' }])}>
            <Plus /> Add another product
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 rounded-xl border bg-card px-4 py-3 text-[13px]">
            <span className="text-muted-foreground">{units} unit{units === 1 ? '' : 's'}</span>
            <span className="text-muted-foreground">Subtotal {formatMoney(subtotal, currency)}</span>
            <span className="text-muted-foreground">GST {gstPct}% {formatMoney(tax, currency)}</span>
            <span className="font-semibold">Total {formatMoney(total, currency)}</span>
          </div>
        </div>
      )}

      {step === 'serials' && (
        <SectionCard title={`Serial numbers · ${filled} of ${serialUnits.length}`}>
          <p className="mb-4 text-[13px] text-muted-foreground">Scan with a USB scanner or the camera button — Enter jumps to the next unit. Items marked “no serial” get their asset tag instead.</p>
          <div className="space-y-5">
            {lines.filter((l) => l.serials && qtyOf(l)).map((l) => (
              <div key={l.id}>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <AssetThumb category={l.category} asset={l} size="sm" /> {nameOf(l)} <span className="font-normal text-muted-foreground">× {qtyOf(l)}</span>
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {serialUnits.map((u, flat) => {
                    if (u.line.id !== l.id) return null;
                    const issue = serialIssue(flat);
                    return (
                      <div key={`${l.id}-${u.index}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-7 shrink-0 text-right text-xs text-muted-foreground">{u.index + 1}</span>
                          <Input
                            ref={(el) => { serialRefs.current[flat] = el; }}
                            value={u.serial}
                            onChange={(e) => setSerial(u, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                // Move now: a USB scanner types the next code straight after Enter.
                                serialRefs.current[flat + 1]?.focus();
                              }
                            }}
                            placeholder="Scan or type"
                            className="font-mono"
                            aria-label={`Serial number ${u.index + 1} for ${nameOf(l)}`}
                            aria-invalid={!!issue || (tried && !u.serial.trim()) || undefined}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-[38px] w-[38px] shrink-0"
                            aria-label={`Scan serial ${u.index + 1}`}
                            onClick={() => openScanner({ title: `Serial ${u.index + 1} · ${nameOf(l)}`, onCode: (code) => { setSerial(u, code); focusSerial(flat + 1); } })}
                          >
                            <ScanLine />
                          </Button>
                        </div>
                        {issue && <p className="ml-9 mt-1 text-xs text-destructive-strong">{issue}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Footer actions */}
      {/* Sticky above the phone tab bar, like the bulk-action bar. */}
      <div className="sticky bottom-[84px] z-30 rounded-xl border bg-background/95 px-4 py-3 shadow-card backdrop-blur md:bottom-4">
        <div className="flex items-center gap-3">
          {step !== 'details' && (
            <Button variant="ghost" onClick={() => { setTried(false); setStep(step === 'serials' ? 'items' : 'details'); }}>
              <ArrowLeft /> Back
            </Button>
          )}
          <p className="mr-auto truncate text-[13px] text-muted-foreground">
            {step === 'details' && (tried && !detailsOk ? <span className="text-destructive-strong"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />Fill in vendor, date and location</span> : 'Step 1 of 3')}
            {step === 'items' && (tried && !itemsOk ? <span className="text-destructive-strong"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />Fix the highlighted products</span> : `${units} unit${units === 1 ? '' : 's'}`)}
            {step === 'serials' && (tried && !serialsOk ? <span className="text-destructive-strong"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />Every unit needs a unique, new serial</span> : `${filled} of ${serialUnits.length} scanned`)}
          </p>
          {step === 'serials' || (step === 'items' && serialUnits.length === 0) ? (
            <Button onClick={step === 'serials' ? save : next}>
              <CheckCircle2 /> Add {units} asset{units === 1 ? '' : 's'}
            </Button>
          ) : (
            <Button onClick={next}>
              Next <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function LineCard({
  line: l,
  index,
  categories,
  currency,
  problem,
  canRemove,
  onChange,
  onRemove,
  byName,
}: {
  line: Line;
  index: number;
  categories: string[];
  currency: string;
  problem: string | null;
  canRemove: boolean;
  onChange: (p: Partial<Line>) => void;
  onRemove: () => void;
  byName?: string;
}) {
  const { toast } = useToast();
  const photo = useModelPhoto(l);
  const setPhoto = useSetModelPhoto();
  const fileRef = useRef<HTMLInputElement>(null);
  const qty = qtyOf(l);
  const price = priceOf(l);

  const addPhoto = async (file?: File) => {
    if (!file) return;
    try {
      await setPhoto.mutateAsync({ brand: l.brand, model: l.model, file, byName, previous: photo });
      toast({ title: 'Photo saved', description: `Shown for every ${nameOf(l)}.` });
    } catch (e) {
      toast({ title: 'Couldn’t save the photo', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={cn('rounded-xl border bg-card p-4', problem && 'border-destructive/50')}>
      <div className="mb-3 flex items-center gap-3">
        <AssetThumb category={l.category} asset={l} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{nameOf(l) || `Product ${index + 1}`}</p>
          <p className="text-xs text-muted-foreground">
            {qty} × {price != null ? formatMoney(price, currency) : 'no price'}
            {problem && <span className="text-destructive-strong"> · {problem}</span>}
          </p>
        </div>
        {l.model.trim() && modelKey(l.brand, l.model) && (
          <>
            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} loading={setPhoto.isPending} className="hidden sm:inline-flex">
              <ImagePlus /> {photo ? 'Replace photo' : 'Add photo'}
            </Button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" aria-label={`Product photo for ${nameOf(l)}`} onChange={(e) => addPhoto(e.target.files?.[0])} />
          </>
        )}
        {canRemove && (
          <Button size="icon-sm" variant="ghost" onClick={onRemove} aria-label={`Remove product ${index + 1}`}>
            <Trash2 />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div className="col-span-2 grid gap-1.5 sm:col-span-2">
          <Label>Type</Label>
          <Select value={l.category} onValueChange={(v) => onChange({ category: v })}>
            <SelectTrigger aria-invalid={!!problem && !l.category}><SelectValue placeholder="Laptop, monitor…" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{titleCase(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`brand-${l.id}`}>Brand</Label>
          <Input id={`brand-${l.id}`} list="d-brands" value={l.brand} onChange={(e) => onChange({ brand: e.target.value })} placeholder="Dell" />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`model-${l.id}`}>Model</Label>
          <Input id={`model-${l.id}`} list="d-models" value={l.model} onChange={(e) => onChange({ model: e.target.value })} placeholder="Latitude 5440" aria-invalid={!!problem && !l.model.trim()} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`price-${l.id}`}>Unit price before GST ({currency})</Label>
          <Input id={`price-${l.id}`} inputMode="decimal" value={l.unitPrice} onChange={(e) => onChange({ unitPrice: e.target.value.replace(/[^\d.]/g, '') })} placeholder="55000" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`qty-${l.id}`}>Quantity</Label>
          <Input id={`qty-${l.id}`} inputMode="numeric" value={l.qty} onChange={(e) => onChange({ qty: e.target.value.replace(/[^\d]/g, '') })} aria-invalid={!!problem && qty < 1} />
        </div>
        <div className="grid gap-1.5">
          <Label>Condition</Label>
          <Select value={l.condition} onValueChange={(v) => onChange({ condition: v as AssetCondition })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['new', 'good', 'fair', 'poor'] as AssetCondition[]).map((c) => <SelectItem key={c} value={c}>{titleCase(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <label className="col-span-2 flex items-center gap-2.5 self-end pb-2 text-[13px] sm:col-span-2">
          <Switch checked={l.serials} onCheckedChange={(v) => onChange({ serials: v })} />
          {l.serials ? 'Has serial numbers' : 'No serial — use the asset tag'}
        </label>
      </div>
    </div>
  );
}

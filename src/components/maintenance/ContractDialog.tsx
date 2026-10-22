import * as React from 'react';
import { FileText, Upload } from 'lucide-react';
import type { ContractCoverage, ContractKind, ServiceContract } from '@/types/asset';
import { useAssets, useSettings } from '@/hooks/useSupabaseData';
import { useSaveContract, useUploadContractDocument } from '@/hooks/useCollab';
import type { ContractInput } from '@/services/collabService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Segmented } from '@/components/app/controls';
import { COVERAGE_META, contractTotal } from '@/lib/contracts';
import { formatMoney, titleCase } from '@/lib/assetMeta';

const ANY = '__any';
const toNum = (v: string) => (v.trim() === '' ? undefined : Number(v));
const empty = (currency = 'INR'): ContractInput => ({ kind: 'amc', vendor: '', coverage: 'non_comprehensive', startDate: '', endDate: '', currency });

export function ContractDialog({
  open,
  onOpenChange,
  contract,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contract?: ServiceContract | null;
  onSaved?: (c: ServiceContract) => void;
}) {
  const { toast } = useToast();
  const save = useSaveContract();
  const upload = useUploadContractDocument();
  const { data: settings } = useSettings();
  const { data: assets = [] } = useAssets();
  const [form, setForm] = React.useState<ContractInput>(empty());
  const [nums, setNums] = React.useState({ units: '', rate: '', taxPercent: '', totalAmount: '' });
  const [file, setFile] = React.useState<File | null>(null);
  const [tried, setTried] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const c = contract;
    setForm(c ? { ...c } : empty(settings?.currency || 'INR'));
    setNums({
      units: c?.units?.toString() ?? '',
      rate: c?.rate?.toString() ?? '',
      taxPercent: c?.taxPercent?.toString() ?? (c ? '' : '18'),
      totalAmount: c?.totalAmount?.toString() ?? '',
    });
    setFile(null);
    setTried(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract]);

  const categories = React.useMemo(() => {
    const seen = new Map<string, string>();
    [...(settings?.categories || []), ...assets.map((a) => a.category)].forEach((c: string) => c && !seen.has(c.toLowerCase()) && seen.set(c.toLowerCase(), titleCase(c)));
    return [...seen.values()].sort();
  }, [settings?.categories, assets]);

  const set = <K extends keyof ContractInput>(k: K, v: ContractInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const computed = contractTotal({ units: toNum(nums.units), rate: toNum(nums.rate), taxPercent: toNum(nums.taxPercent), totalAmount: undefined });
  const datesBad = !!form.startDate && !!form.endDate && form.endDate < form.startDate;
  const invalid = !form.vendor.trim() || !form.startDate || !form.endDate || datesBad;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (invalid) return;
    const input: ContractInput = {
      ...form,
      units: toNum(nums.units),
      rate: toNum(nums.rate),
      taxPercent: toNum(nums.taxPercent),
      totalAmount: toNum(nums.totalAmount) ?? computed,
    };
    try {
      let saved = await save.mutateAsync({ input, id: contract?.id });
      if (file) saved = await upload.mutateAsync({ contract: saved, file });
      toast({ title: contract ? 'Contract updated' : 'Contract added', description: contract ? 'Linked assets now use the new dates.' : 'Next, add the assets it covers.' });
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      toast({ title: 'Couldn’t save the contract', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[640px]">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{contract ? 'Edit contract' : 'Add AMC or warranty'}</DialogTitle>
            <DialogDescription>Record the vendor’s terms once, then pick the assets it covers. Their AMC / warranty dates follow the contract.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Segmented<ContractKind> className="flex w-full" value={form.kind} onChange={(v) => set('kind', v)} options={[{ value: 'amc', label: 'AMC' }, { value: 'warranty', label: 'Warranty' }]} />
            </div>
            <div className="grid gap-1.5">
              <Label>For</Label>
              <Select value={form.category || ANY} onValueChange={(v) => set('category', v === ANY ? undefined : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any asset type</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-vendor">Vendor</Label>
              <Input id="c-vendor" value={form.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="e.g. Pratham Info Solutions" aria-invalid={tried && !form.vendor.trim()} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-ref">Invoice / contract no.</Label>
              <Input id="c-ref" value={form.reference || ''} onChange={(e) => set('reference', e.target.value)} placeholder="e.g. PIS/2026-27/062" className="font-mono" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Coverage</Label>
            <Segmented<ContractCoverage>
              className="flex w-full"
              value={form.coverage}
              onChange={(v) => set('coverage', v)}
              options={(['non_comprehensive', 'comprehensive'] as ContractCoverage[]).map((c) => ({ value: c, label: COVERAGE_META[c].label }))}
            />
            <p className="text-xs text-muted-foreground">{COVERAGE_META[form.coverage].hint}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Starts</Label>
              <DatePicker value={form.startDate} onChange={(v) => set('startDate', v)} className="h-[38px] w-full" />
            </div>
            <div className="grid gap-1.5">
              <Label>Ends</Label>
              <DatePicker value={form.endDate} onChange={(v) => set('endDate', v)} className="h-[38px] w-full" />
              {datesBad && <p className="text-xs text-destructive-strong">Must be on or after the start date.</p>}
            </div>
          </div>
          {tried && (!form.startDate || !form.endDate) && <p className="-mt-2 text-xs text-destructive-strong">Both dates are required.</p>}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="c-units">Units</Label>
              <Input id="c-units" inputMode="numeric" value={nums.units} onChange={(e) => setNums((n) => ({ ...n, units: e.target.value.replace(/[^\d]/g, '') }))} placeholder="15" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-rate">Rate / unit ({form.currency})</Label>
              <Input id="c-rate" inputMode="decimal" value={nums.rate} onChange={(e) => setNums((n) => ({ ...n, rate: e.target.value.replace(/[^\d.]/g, '') }))} placeholder="1800" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-tax">GST %</Label>
              <Input id="c-tax" inputMode="decimal" value={nums.taxPercent} onChange={(e) => setNums((n) => ({ ...n, taxPercent: e.target.value.replace(/[^\d.]/g, '') }))} placeholder="18" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-total">Total</Label>
              <Input id="c-total" inputMode="decimal" value={nums.totalAmount} onChange={(e) => setNums((n) => ({ ...n, totalAmount: e.target.value.replace(/[^\d.]/g, '') }))} placeholder={computed != null ? String(computed) : 'Incl. tax'} />
            </div>
          </div>
          {computed != null && !nums.totalAmount && <p className="-mt-2 text-xs text-muted-foreground">Total will be {formatMoney(computed, form.currency)} including GST.</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="c-covers">What’s covered</Label>
              <Textarea id="c-covers" rows={2} value={form.covers || ''} onChange={(e) => set('covers', e.target.value)} placeholder="e.g. Service and labour for hardware repairs" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-excludes">Not covered / billed extra</Label>
              <Textarea id="c-excludes" rows={2} value={form.excludes || ''} onChange={(e) => set('excludes', e.target.value)} placeholder="e.g. Replacement parts" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="c-support">Support contact</Label>
            <Input id="c-support" value={form.supportContact || ''} onChange={(e) => set('supportContact', e.target.value)} placeholder="Name · phone · email" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea id="c-notes" rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Payment terms, PO reference, how to raise a ticket…" />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 hover:bg-subtle">
            {file || contract?.documentName ? <FileText className="h-5 w-5 shrink-0 text-muted-foreground" /> : <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />}
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-medium">{file?.name || contract?.documentName || 'Attach the invoice or contract (PDF)'}</span>
              <span className="block text-xs text-muted-foreground">{file ? 'Uploads when you save' : contract?.documentName ? 'Choose a file to replace it' : 'Optional · up to 20 MB'}</span>
            </span>
            <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending || upload.isPending}>{contract ? 'Save changes' : 'Add contract'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

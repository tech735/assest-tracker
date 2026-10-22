import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Download, FileSpreadsheet, Lock, ScanLine, Upload, XCircle } from 'lucide-react';
import { useAssets, useLocations } from '@/hooks/useSupabaseData';
import * as supabaseService from '@/services/supabaseService';
import type { Asset, AssetCategory, AssetCondition } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, PageHeader, ProgressBar } from '@/components/app/primitives';
import { useAccess } from '@/hooks/useCollab';
import { BulkAssetAddDialog } from '@/components/assets/BulkAssetAddDialog';
import { downloadText, parseCSV, parseLooseDate, toCSV } from '@/lib/csv';
import { displayLocation } from '@/lib/assetMeta';
import { cn } from '@/lib/utils';

type FieldKey =
  | 'name' | 'serialNumber' | 'brand' | 'model' | 'category' | 'location' | 'purchaseDate' | 'purchaseCost'
  | 'vendor' | 'warrantyEnd' | 'amcStartDate' | 'amcEndDate' | 'condition' | 'notes';

const FIELDS: { key: FieldKey; label: string; required?: boolean; synonyms: string[] }[] = [
  { key: 'name', label: 'Asset name', required: true, synonyms: ['name', 'asset name', 'device name', 'device', 'item', 'product'] },
  { key: 'serialNumber', label: 'Serial number', required: true, synonyms: ['serial', 'serial no', 'serial number', 'sn', 's/n', 'serial_number'] },
  { key: 'brand', label: 'Brand', required: true, synonyms: ['brand', 'make', 'manufacturer', 'oem'] },
  { key: 'model', label: 'Model', synonyms: ['model', 'model no', 'model number'] },
  { key: 'category', label: 'Category', required: true, synonyms: ['category', 'type', 'asset type', 'class'] },
  { key: 'location', label: 'Location', synonyms: ['location', 'branch', 'site', 'office', 'store'] },
  { key: 'purchaseDate', label: 'Purchase date', synonyms: ['purchase date', 'bought on', 'date of purchase', 'invoice date', 'purchased'] },
  { key: 'purchaseCost', label: 'Purchase cost', synonyms: ['cost', 'price', 'purchase cost', 'amount', 'value'] },
  { key: 'vendor', label: 'Vendor', synonyms: ['vendor', 'supplier', 'seller', 'purchased from'] },
  { key: 'warrantyEnd', label: 'Warranty end', synonyms: ['warranty', 'warranty end', 'warranty till', 'warranty expiry'] },
  { key: 'amcStartDate', label: 'AMC start', synonyms: ['amc start', 'amc from'] },
  { key: 'amcEndDate', label: 'AMC end', synonyms: ['amc end', 'amc till', 'amc expiry', 'amc to'] },
  { key: 'condition', label: 'Condition', synonyms: ['condition', 'state'] },
  { key: 'notes', label: 'Notes', synonyms: ['notes', 'remarks', 'comment', 'comments', 'description'] },
];
const IGNORE = '__ignore__';
const norm = (s: string) => s.toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();

type Step = 1 | 2 | 3 | 4;
interface RowResult { row: number; status: 'ready' | 'warning' | 'error'; issues: string[]; asset?: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> }

export default function AssetImport() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: assets = [] } = useAssets();
  const { data: locations = [] } = useLocations();
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [defaultLocation, setDefaultLocation] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState({ done: 0, failed: 0, total: 0, running: false, finished: false });
  const [scanWizard, setScanWizard] = useState(false);
  const { can } = useAccess();
  const canEditAssets = can('assets.edit');

  const headers = rows[0] || [];
  const body = rows.slice(1);

  const load = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result || ''));
      setFileName(file.name);
      setRows(parsed);
      // Auto-map by header synonyms
      const used = new Set<string>();
      const auto: Record<number, string> = {};
      (parsed[0] || []).forEach((h, i) => {
        const f = FIELDS.find((f) => !used.has(f.key) && f.synonyms.includes(norm(h)));
        auto[i] = f ? f.key : IGNORE;
        if (f) used.add(f.key);
      });
      setMapping(auto);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const mappedKeys = Object.values(mapping).filter((k) => k !== IGNORE);
  const missingRequired = FIELDS.filter((f) => f.required && !mappedKeys.includes(f.key));
  const locationMapped = mappedKeys.includes('location');

  const results: RowResult[] = useMemo(() => {
    if (step < 3) return [];
    const existing = new Set(assets.map((a) => a.serialNumber?.toLowerCase()));
    const seen = new Set<string>();
    const locByName = new Map(locations.map((l) => [l.name.toLowerCase(), l]));
    const fallback = locations.find((l) => l.id === defaultLocation);
    return body.map((cells, i) => {
      const get = (k: FieldKey) => {
        const idx = Object.entries(mapping).find(([, v]) => v === k)?.[0];
        return idx === undefined ? '' : (cells[Number(idx)] || '').trim();
      };
      const issues: string[] = [];
      let status: RowResult['status'] = 'ready';
      for (const f of FIELDS.filter((f) => f.required)) if (!get(f.key)) { issues.push(`Missing ${f.label.toLowerCase()}`); status = 'error'; }
      const serial = get('serialNumber');
      if (serial && (existing.has(serial.toLowerCase()) || seen.has(serial.toLowerCase()))) {
        issues.push(existing.has(serial.toLowerCase()) ? 'Serial already in register' : 'Duplicate serial in file');
        if (status !== 'error') status = skipDuplicates ? 'warning' : 'error';
      }
      seen.add(serial.toLowerCase());
      const locName = get('location');
      const loc = (locName && (locByName.get(locName.toLowerCase()) || locations.find((l) => l.name.toLowerCase().includes(locName.toLowerCase())))) || fallback;
      if (!loc) { issues.push(locName ? `Unknown location “${locName}”` : 'No location'); status = 'error'; }
      else if (locName && !locByName.get(locName.toLowerCase())) issues.push(`Location matched to ${displayLocation(loc.name)}`);
      const dateOrNull = (k: FieldKey) => {
        const raw = get(k);
        if (!raw) return undefined;
        const d = parseLooseDate(raw);
        if (!d) { issues.push(`Couldn’t read ${FIELDS.find((f) => f.key === k)!.label.toLowerCase()} “${raw}”`); if (status === 'ready') status = 'warning'; }
        return d ?? undefined;
      };
      const purchaseDate = dateOrNull('purchaseDate');
      const warrantyEnd = dateOrNull('warrantyEnd');
      const amcStartDate = dateOrNull('amcStartDate');
      const amcEndDate = dateOrNull('amcEndDate');
      const cond = get('condition').toLowerCase();
      const asset = loc && status !== 'error'
        ? {
            name: get('name'),
            serialNumber: serial,
            brand: get('brand'),
            model: get('model') || '—',
            category: get('category').toLowerCase() as AssetCategory,
            status: 'available' as const,
            condition: (['new', 'good', 'fair', 'poor'].includes(cond) ? cond : 'good') as AssetCondition,
            location: loc.name,
            locationId: loc.id,
            assetTag: '',
            purchaseDate: purchaseDate || new Date().toISOString().slice(0, 10),
            purchaseCost: Number(get('purchaseCost').replace(/[^\d.]/g, '')) || 0,
            vendor: get('vendor') || 'Unknown',
            warrantyStart: warrantyEnd ? purchaseDate : undefined,
            warrantyEnd,
            amcStartDate,
            amcEndDate,
            notes: get('notes') || undefined,
          }
        : undefined;
      return { row: i + 2, status, issues, asset };
    });
  }, [step, body, mapping, assets, locations, defaultLocation, skipDuplicates]);

  const ready = results.filter((r) => r.status === 'ready');
  const warnings = results.filter((r) => r.status === 'warning');
  const errors = results.filter((r) => r.status === 'error');
  const toImport = results.filter((r) => r.asset && (r.status === 'ready' || (r.status === 'warning' && !r.issues.some((i) => i.includes('Serial') || i.includes('serial')))));

  const runImport = async () => {
    setStep(4);
    setProgress({ done: 0, failed: 0, total: toImport.length, running: true, finished: false });
    let done = 0;
    let failed = 0;
    for (const r of toImport) {
      try {
        await supabaseService.createAsset(r.asset!);
        done++;
      } catch {
        failed++;
      }
      setProgress({ done, failed, total: toImport.length, running: true, finished: false });
    }
    setProgress({ done, failed, total: toImport.length, running: false, finished: true });
    qc.invalidateQueries({ queryKey: ['assets'] });
    qc.invalidateQueries({ queryKey: ['locations'] });
    qc.invalidateQueries({ queryKey: ['dashboardStats'] });
  };

  const template = () =>
    downloadText(
      'asset-import-template.csv',
      toCSV([
        ['Name', 'Serial Number', 'Brand', 'Model', 'Category', 'Location', 'Purchase Date', 'Cost', 'Vendor', 'Warranty End', 'AMC Start', 'AMC End', 'Condition', 'Notes'],
        ['MacBook Air 13 M3', 'C02XK1LMQ6L4', 'Apple', 'MBA 13 M3 16/512', 'laptop', locations[0]?.name || 'Mumbai HQ', '18/10/2026', '114900', 'Imagine Store', '17/10/2027', '', '', 'new', ''],
      ]),
    );
  const errorReport = () =>
    downloadText('import-issues.csv', toCSV([['Row', 'Status', 'Issues'], ...results.filter((r) => r.status !== 'ready').map((r) => [r.row, r.status, r.issues.join('; ')])]));

  const steps = ['Upload file', 'Map columns', 'Review', 'Import'];
  if (!canEditAssets)
    return (
      <EmptyState icon={Lock} title="You can’t import assets" description="Your role is read-only for assets. Ask an admin (Settings → Roles & permissions) if you need access." />
    );

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Assets', to: '/assets' }, { label: 'Import' }]}
        title="Import assets"
        actions={
          <>
            <Button variant="ghost" onClick={() => setScanWizard(true)}>
              <ScanLine /> Receive stock by scanning
            </Button>
            <Button variant="ghost" onClick={template}>
              <Download /> Download template
            </Button>
          </>
        }
      />

      {/* Stepper */}
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((s, i) => {
          const n = (i + 1) as Step;
          const state = n < step ? 'done' : n === step ? 'current' : 'todo';
          return (
            <li key={s} className={cn('flex items-center gap-2', i < steps.length - 1 && 'flex-1')}>
              <span className={cn('flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-xs font-semibold', state === 'todo' ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground')}>
                {state === 'done' ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
              <span className={cn('hidden text-[13px] font-medium sm:inline', state === 'todo' && 'text-muted-foreground')}>{s}</span>
              {i < steps.length - 1 && <span className={cn('h-0.5 flex-1 rounded-full', n < step ? 'bg-primary' : 'bg-border')} />}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) load(f); }}
          className={cn('flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card px-6 py-16 text-center transition-colors', dragging ? 'border-ring bg-primary-soft' : 'border-border-strong hover:bg-subtle')}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-link">
            <Upload className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold">Drop a CSV here or click to browse</p>
            <p className="mt-1 text-sm text-muted-foreground">Any column names work — you’ll match them to fields in the next step. Export from Excel as “CSV UTF-8”.</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        </label>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-2.5 border-b px-5 py-3.5">
              <FileSpreadsheet className="h-[18px] w-[18px] text-muted-foreground" />
              <p className="flex-1 truncate text-[13px] font-medium">{fileName} · {body.length.toLocaleString()} rows · {headers.length} columns</p>
              <button onClick={() => { setStep(1); setRows([]); }} className="text-[13px] font-medium text-link hover:underline">Replace file</button>
            </div>
            <div className="divide-y">
              <div className="hidden grid-cols-[1fr_1fr_24px_220px] gap-3 bg-subtle px-5 py-2.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
                <span>Column in file</span><span>Sample value</span><span /><span>Maps to field</span>
              </div>
              {headers.map((h, i) => {
                const mapped = mapping[i] && mapping[i] !== IGNORE;
                return (
                  <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 px-5 py-3 md:grid-cols-[1fr_1fr_24px_220px]">
                    <p className="truncate text-[13px] font-medium">{h || `Column ${i + 1}`}</p>
                    <p className="col-span-2 row-start-2 truncate text-[13px] text-muted-foreground md:col-span-1 md:row-start-auto">{body[0]?.[i] || '—'}</p>
                    <ChevronRight className="hidden h-4 w-4 text-faint md:block" />
                    <Select value={mapping[i] || IGNORE} onValueChange={(val) => setMapping((m) => ({ ...m, [i]: val }))}>
                      <SelectTrigger className={cn('h-8 w-[180px] md:w-full', !mapped && 'text-muted-foreground')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={IGNORE}>Don’t import</SelectItem>
                        {FIELDS.map((f) => (
                          <SelectItem key={f.key} value={f.key} disabled={mappedKeys.includes(f.key) && mapping[i] !== f.key}>
                            {f.label}{f.required ? ' *' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border bg-card p-5">
              <p className="mb-3 text-[15px] font-semibold">Required fields</p>
              <ul className="space-y-2">
                {FIELDS.filter((f) => f.required).map((f) => {
                  const ok = mappedKeys.includes(f.key);
                  return (
                    <li key={f.key} className="flex items-center gap-2 text-[13px]">
                      {ok ? <CheckCircle2 className="h-4 w-4 text-success-strong" /> : <AlertTriangle className="h-4 w-4 text-warning-strong" />}
                      <span className={ok ? '' : 'text-warning-strong'}>{f.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="space-y-3 rounded-xl border bg-card p-5">
              <p className="text-[15px] font-semibold">Options</p>
              <div>
                <p className="mb-1.5 text-[13px] text-muted-foreground">{locationMapped ? 'Location for rows that don’t match' : 'Put all assets in'}</p>
                <Select value={defaultLocation} onValueChange={setDefaultLocation}>
                  <SelectTrigger><SelectValue placeholder="Choose location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{displayLocation(l.name)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-3 text-[13px]">
                <span className="flex-1">Skip rows whose serial already exists</span>
                <Switch checked={skipDuplicates} onCheckedChange={setSkipDuplicates} />
              </label>
              <p className="text-xs text-muted-foreground">Asset tags are generated automatically.</p>
            </div>
          </aside>
          <div className="flex items-center gap-2 lg:col-span-2">
            <Button variant="secondary" onClick={() => setStep(1)}><ArrowLeft /> Back</Button>
            <div className="flex-1" />
            {missingRequired.length > 0 && <p className="hidden text-[13px] text-warning-strong sm:block">Map {missingRequired.map((f) => f.label.toLowerCase()).join(', ')} to continue</p>}
            <Button disabled={missingRequired.length > 0 || (!locationMapped && !defaultLocation)} onClick={() => setStep(3)}>
              Continue to review <ArrowRight />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { cls: 'bg-success-soft text-success-strong', icon: CheckCircle2, n: ready.length, l: 'rows ready to import' },
              { cls: 'bg-warning-soft text-warning-strong', icon: AlertTriangle, n: warnings.length, l: skipDuplicates ? 'warnings (duplicates are skipped)' : 'warnings' },
              { cls: 'bg-destructive-soft text-destructive-strong', icon: XCircle, n: errors.length, l: 'rows with errors — not imported' },
            ].map((s) => (
              <div key={s.l} className={cn('flex items-center gap-3 rounded-xl px-4 py-3.5', s.cls)}>
                <s.icon className="h-5 w-5" />
                <span className="text-xl font-semibold tabular">{s.n}</span>
                <span className="text-[13px]">{s.l}</span>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center border-b px-5 py-3">
              <p className="flex-1 text-[15px] font-semibold">Rows that need attention</p>
              {results.some((r) => r.status !== 'ready') && <button onClick={errorReport} className="text-[13px] font-medium text-link hover:underline">Download issue report</button>}
            </div>
            <div className="max-h-[420px] divide-y overflow-y-auto">
              {results.filter((r) => r.status !== 'ready' || r.issues.length).slice(0, 200).map((r) => (
                <div key={r.row} className="flex items-start gap-3 px-5 py-2.5 text-[13px]">
                  <span className="w-14 shrink-0 text-muted-foreground tabular">Row {r.row}</span>
                  {r.status === 'error' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive-strong" /> : r.status === 'warning' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-strong" />}
                  <span className="flex-1">{r.issues.join(' · ')}</span>
                </div>
              ))}
              {results.every((r) => r.status === 'ready' && !r.issues.length) && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Everything looks good.</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setStep(2)}><ArrowLeft /> Back</Button>
            <div className="flex-1" />
            <Button disabled={!toImport.length} onClick={runImport}>
              Import {toImport.length.toLocaleString()} assets <ArrowRight />
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mx-auto max-w-lg space-y-5 rounded-2xl border bg-card p-8 text-center">
          <span className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-2xl', progress.finished ? 'bg-success-soft text-success-strong' : 'bg-primary-soft text-link')}>
            {progress.finished ? <CheckCircle2 className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
          </span>
          <div>
            <p className="text-lg font-semibold">{progress.finished ? 'Import complete' : 'Importing…'}</p>
            <p className="mt-1 text-sm text-muted-foreground tabular">
              {progress.done} of {progress.total} created{progress.failed ? ` · ${progress.failed} failed` : ''}
            </p>
          </div>
          <ProgressBar value={progress.total ? (progress.done + progress.failed) / progress.total : 0} tone="primary" className="h-2" />
          {progress.finished && (
            <div className="flex justify-center gap-2">
              <Button variant="secondary" onClick={() => { setStep(1); setRows([]); }}>Import another file</Button>
              <Button onClick={() => navigate('/assets?sort=updated')}>View assets</Button>
            </div>
          )}
        </div>
      )}

      <BulkAssetAddDialog open={scanWizard} onOpenChange={setScanWizard} showTrigger={false} />
      <p className="text-center text-xs text-muted-foreground">
        Prefer one at a time? <Link to="/assets/new" className="font-medium text-link hover:underline">Add a single asset</Link>
      </p>
    </div>
  );
}

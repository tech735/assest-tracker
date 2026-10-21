import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Camera, CheckCircle2, ClipboardCheck, Download, Keyboard, MapPin, Undo2, XCircle } from 'lucide-react';
import { useAssets, useLocations, useUpdateAsset } from '@/hooks/useSupabaseData';
import { useAccess, useAuditDetail, useCloseAudit, useDeleteScan, useRecordScan } from '@/hooks/useCollab';
import { useToast } from '@/hooks/use-toast';
import type { AuditScan, AuditScanResult } from '@/types/asset';
import { Button } from '@/components/ui/button';
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
import { ViewTabs } from '@/components/app/controls';
import { EmptyState, PageHeader, PageLoader, Pill, ProgressBar } from '@/components/app/primitives';
import { CameraScanner } from '@/components/audits/CameraScanner';
import { findAssetByCode } from '@/lib/scan';
import { useAssetActions } from '@/components/assets/useAssetActions';
import { displayLocation, formatDate, timeAgo } from '@/lib/assetMeta';
import { downloadText, toCSV } from '@/lib/csv';
import { cn } from '@/lib/utils';

type Tab = 'feed' | 'missing' | 'misplaced' | 'unexpected';
const RESULT_META: Record<AuditScanResult, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  found: { icon: CheckCircle2, cls: 'text-success-strong', label: 'Expected here' },
  misplaced: { icon: MapPin, cls: 'text-warning-strong', label: 'Registered elsewhere' },
  unexpected: { icon: AlertTriangle, cls: 'text-special-strong', label: 'Not in register' },
};

export default function AuditRun() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading } = useAuditDetail(id);
  const { data: assets = [] } = useAssets();
  const { data: locations = [] } = useLocations();
  const { access, can } = useAccess();
  const record = useRecordScan(id);
  const undo = useDeleteScan(id);
  const close = useCloseAudit(id);
  const updateAsset = useUpdateAsset();
  const { open: act, dialogs } = useAssetActions();
  const [code, setCode] = useState('');
  const [camera, setCamera] = useState(false);
  const [tab, setTab] = useState<Tab>('feed');
  const [confirmClose, setConfirmClose] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const view = useMemo(() => {
    if (!data) return null;
    const expectedIds = new Set(data.items.map((i) => i.assetId));
    const foundIds = new Set(data.scans.filter((s) => s.result === 'found').map((s) => s.assetId));
    return {
      expectedIds,
      found: data.scans.filter((s) => s.result === 'found'),
      misplaced: data.scans.filter((s) => s.result === 'misplaced'),
      unexpected: data.scans.filter((s) => s.result === 'unexpected'),
      missing: data.items.filter((i) => !foundIds.has(i.assetId)),
      scannedCodes: new Set(data.scans.map((s) => s.code.toLowerCase())),
    };
  }, [data]);

  if (isLoading) return <PageLoader label="Loading audit" />;
  if (!data || !view) return <EmptyState icon={ClipboardCheck} title="Audit not found" action={<Button onClick={() => navigate('/audits')}>Back to audits</Button>} />;
  const { audit } = data;
  const running = audit.status === 'in_progress' && can('audits.run');
  const pct = audit.expectedCount ? view.found.length / audit.expectedCount : 0;
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const auditLocation = locations.find((l) => l.id === audit.locationId);

  const scan = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const asset = findAssetByCode(assets, value);
    const key = (asset?.assetTag || value).toLowerCase();
    if (view.scannedCodes.has(key)) {
      toast({ title: 'Already scanned', description: asset ? `${asset.assetTag} · ${asset.name}` : value });
      return;
    }
    const result: AuditScanResult = !asset ? 'unexpected' : view.expectedIds.has(asset.id) ? 'found' : 'misplaced';
    try {
      await record.mutateAsync({ auditId: id, assetId: asset?.id, code: asset?.assetTag || value, result, scannedByName: access?.name || undefined });
      navigator.vibrate?.(result === 'found' ? 30 : [40, 60, 40]);
    } catch (e) {
      toast({ title: 'Couldn’t record scan', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  const exportCsv = () =>
    downloadText(
      `audit-${audit.name.replace(/\W+/g, '-').toLowerCase()}.csv`,
      toCSV([
        ['Result', 'Tag / code', 'Asset', 'Scanned by', 'When'],
        ...data.scans.map((s) => [s.result, s.code, assetById.get(s.assetId || '')?.name || '', s.scannedByName || '', s.scannedAt]),
        ...view.missing.map((m) => ['missing', m.assetTag || '', m.assetName || '', '', '']),
      ]),
    );

  const finish = async () => {
    const accuracy = audit.expectedCount ? Math.round((view.found.length / audit.expectedCount) * 10000) / 100 : 100;
    try {
      await close.mutateAsync(accuracy);
      toast({ title: 'Audit closed', description: `Accuracy ${accuracy}%` });
      navigate('/audits');
    } catch (e) {
      toast({ title: 'Couldn’t close audit', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  const moveHere = async (s: AuditScan) => {
    const a = s.assetId ? assetById.get(s.assetId) : undefined;
    if (!a || !auditLocation) return;
    try {
      await updateAsset.mutateAsync({ id: a.id, updates: { location: auditLocation.name, locationId: auditLocation.id } });
      toast({ title: `${a.assetTag} moved to ${displayLocation(auditLocation.name)}` });
    } catch {
      toast({ title: 'Couldn’t move asset', variant: 'destructive' });
    }
  };

  const ScanRow = ({ s }: { s: AuditScan }) => {
    const m = RESULT_META[s.result];
    const a = s.assetId ? assetById.get(s.assetId) : undefined;
    return (
      <li className="flex items-center gap-3 px-4 py-2.5">
        <m.icon className={cn('h-[18px] w-[18px] shrink-0', m.cls)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{a ? `${a.name} · ${a.assetTag}` : s.code}</p>
          <p className={cn('truncate text-xs', s.result === 'found' ? 'text-muted-foreground' : m.cls)}>
            {s.result === 'misplaced' && a ? `Registered at ${displayLocation(a.location)}` : m.label} · {timeAgo(s.scannedAt)}{s.scannedByName ? ` · ${s.scannedByName}` : ''}
          </p>
        </div>
        {running && s.result === 'misplaced' && can('assets.edit') && <Button size="sm" variant="secondary" onClick={() => moveHere(s)}>Move here</Button>}
        {running && s.result === 'unexpected' && can('assets.edit') && <Button size="sm" variant="secondary" asChild><Link to={`/assets/new?serial=${encodeURIComponent(s.code)}`}>Add asset</Link></Button>}
        {running && <Button size="icon-sm" variant="ghost" onClick={() => undo.mutate(s.id)} aria-label="Undo scan"><Undo2 /></Button>}
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Audits', to: '/audits' }, { label: audit.name }]}
        title={audit.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {audit.status === 'closed' ? <Pill tone="success">Closed {formatDate(audit.closedAt)} · {audit.accuracy}%</Pill> : <Pill tone="info">In progress</Pill>}
            <span>{audit.locationName}{audit.dueDate ? ` · due ${formatDate(audit.dueDate)}` : ''}</span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv}><Download /> <span className="hidden sm:inline">Export discrepancies</span></Button>
            {running && <Button onClick={() => setConfirmClose(true)}><ClipboardCheck /> Close audit</Button>}
          </>
        }
      />

      <div className="space-y-2 rounded-xl border bg-card p-4">
        <div className="flex text-sm"><span className="flex-1 font-medium">{view.found.length} of {audit.expectedCount} found</span><span className="font-semibold tabular">{Math.round(pct * 100)}%</span></div>
        <ProgressBar value={pct} tone="primary" className="h-2.5" />
        <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span className="text-success-strong">{view.found.length} found</span>
          <span className="text-warning-strong">{view.misplaced.length} misplaced</span>
          <span className="text-special-strong">{view.unexpected.length} unexpected</span>
          <span className="text-destructive-strong">{view.missing.length} not scanned</span>
        </div>
      </div>

      {running && (
        <div className="space-y-3">
          {camera && <CameraScanner onCode={scan} />}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              scan(code);
              setCode('');
              inputRef.current?.focus();
            }}
            className="flex gap-2"
          >
            <label className="flex h-11 flex-1 items-center gap-2 rounded-xl border bg-card px-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
              <Keyboard className="h-4 w-4 text-faint" />
              <input
                ref={inputRef}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Scan with a USB scanner or type a tag / serial, then Enter"
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-faint focus-visible:ring-0"
              />
            </label>
            <Button type="button" variant={camera ? 'default' : 'secondary'} className="h-11" onClick={() => setCamera((c) => !c)}>
              <Camera /> <span className="hidden sm:inline">{camera ? 'Camera on' : 'Use camera'}</span>
            </Button>
          </form>
        </div>
      )}

      <ViewTabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'feed', label: 'Just scanned', count: data.scans.length },
          { value: 'missing', label: 'Not scanned', count: view.missing.length },
          { value: 'misplaced', label: 'Misplaced', count: view.misplaced.length },
          { value: 'unexpected', label: 'Unexpected', count: view.unexpected.length },
        ]}
      />
      <div className="overflow-hidden rounded-xl border bg-card">
        {tab === 'missing' ? (
          view.missing.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Everything expected has been found" className="py-10" />
          ) : (
            <ul className="divide-y">
              {view.missing.map((m) => {
                const a = assetById.get(m.assetId);
                return (
                  <li key={m.assetId} className="flex items-center gap-3 px-4 py-2.5">
                    <XCircle className="h-[18px] w-[18px] shrink-0 text-destructive-strong" />
                    <Link to={`/assets/${m.assetId}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.assetName} · {m.assetTag}</p>
                      <p className="truncate text-xs text-muted-foreground">S/N {m.serialNumber}{a?.assignedTo ? ` · held by ${a.assignedTo}` : ''}</p>
                    </Link>
                    {audit.status === 'closed' && a && a.status !== 'lost' && can('assets.edit') && <Button size="sm" variant="secondary" onClick={() => act('lost', a)}>Mark lost</Button>}
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          (() => {
            const list = tab === 'feed' ? data.scans : tab === 'misplaced' ? view.misplaced : view.unexpected;
            return list.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title={tab === 'feed' ? 'Nothing scanned yet' : 'None'} description={tab === 'feed' && running ? 'Scan a label to begin.' : undefined} className="py-10" />
            ) : (
              <ul className="divide-y">{list.map((s) => <ScanRow key={s.id} s={s} />)}</ul>
            );
          })()
        )}
      </div>

      {dialogs}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this audit?</AlertDialogTitle>
            <AlertDialogDescription>
              {view.missing.length ? `${view.missing.length} expected asset${view.missing.length > 1 ? 's were' : ' was'} not scanned. ` : 'Every expected asset was found. '}
              Accuracy will be recorded as {Math.round(pct * 10000) / 100}%. You can still mark missing items as lost afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep scanning</AlertDialogCancel>
            <AlertDialogAction onClick={finish}>Close audit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

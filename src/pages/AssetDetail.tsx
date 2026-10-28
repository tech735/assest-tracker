import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { addYears, parseISO } from 'date-fns';
import {
  ArrowLeftRight,
  Building2,
  CalendarDays,
  Check,
  Layers,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  Printer,
  QrCode,
  Receipt,
  ShieldCheck,
  Tag,
  Wallet,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { useAssets, useEmployees, useSettings } from '@/hooks/useSupabaseData';
import { NoAccess } from '@/components/RequirePage';
import { ReportProblemDialog } from '@/components/assets/ReportProblemDialog';
import { Button } from '@/components/ui/button';
import { ViewTabs } from '@/components/app/controls';
import { AssetThumb, CardLink, EmptyState, KeyValue, PageHeader, PageLoader, PersonAvatar, SectionCard, StatusBadge } from '@/components/app/primitives';
import { AssetRowMenu, AssetTimeline, CoverageCard } from '@/components/assets/AssetPanels';
import { primaryAction, useAssetActions } from '@/components/assets/useAssetActions';
import { LabelDialog } from '@/components/assets/LabelDialog';
import { AssetFilesPanel, NoteComposer } from '@/components/assets/AssetCollab';
import { useAccess } from '@/hooks/useCollab';
import { usePurchaseInvoices } from '@/hooks/usePurchases';
import { ModelPhotoCard } from '@/components/assets/ModelPhotoCard';
import { bookValue, displayLocation, formatDate, formatMoney, titleCase } from '@/lib/assetMeta';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'activity' | 'maintenance' | 'files';

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: assets = [], isLoading } = useAssets();
  const { data: settings } = useSettings();
  const currency = settings?.currency;
  const asset = useMemo(() => assets.find((a) => a.id === id), [assets, id]);
  const { open: act, dialogs } = useAssetActions();
  const { can, access, ready } = useAccess();
  const { data: employees = [] } = useEmployees();
  const [tab, setTab] = useState<Tab>('overview');
  const [labelOpen, setLabelOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  // Without the Assets page, people can still open (read-only) the assets assigned to them.
  const holderEmail = employees.find((e) => e.id === asset?.assignedToId)?.email?.toLowerCase();
  const mine = !!asset && asset.status === 'assigned' && !!access?.email && holderEmail === access.email.toLowerCase();
  const staff = can('assets.view');
  const seesInvoices = can('costs.view') || can('assets.edit');
  const { data: invoices = [] } = usePurchaseInvoices(seesInvoices && !!asset?.purchaseInvoiceId);
  const invoice = invoices.find((i) => i.id === asset?.purchaseInvoiceId);

  // Deep links from the scanner / quick view: ?action=checkout|checkin, ?print=label
  useEffect(() => {
    if (!asset) return;
    const action = params.get('action');
    if (params.get('print') === 'label') setLabelOpen(true);
    if (action === 'checkout' && asset.status === 'available') act('assign', asset);
    if (action === 'checkin' && asset.status === 'assigned') act('return', asset);
    if (action || params.get('print')) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.id]);

  if (isLoading || !ready) return <PageLoader label="Loading asset" />;
  if (!staff && !mine) return <NoAccess />;
  if (!asset)
    return (
      <EmptyState
        icon={Package}
        title="Asset not found"
        description="It may have been deleted, or the link is wrong."
        action={<Button onClick={() => navigate('/assets')}>Back to assets</Button>}
      />
    );

  const primaryRaw = primaryAction(asset.status);
  const primary = primaryRaw && (primaryRaw.action === 'repair' ? can('maintenance.manage') : can('assets.checkout')) ? primaryRaw : null;
  const canEdit = can('assets.edit');
  const bv = bookValue(asset);
  const retireBy = asset.purchaseDate ? addYears(parseISO(asset.purchaseDate), 3) : null;
  const steps = [
    { label: 'Purchased', sub: formatDate(asset.purchaseDate), done: !!asset.purchaseDate },
    { label: 'Tagged', sub: formatDate(asset.createdAt), done: true },
    {
      label: asset.status === 'assigned' ? 'Assigned' : asset.status === 'repair' ? 'In repair' : asset.status === 'lost' ? 'Lost' : asset.status === 'retired' ? 'Retired' : 'In stock',
      sub: asset.assignedTo || displayLocation(asset.location),
      current: true,
    },
    { label: 'Retire', sub: retireBy ? `Planned ${formatDate(retireBy, 'MMM yyyy')}` : 'Not planned', done: asset.status === 'retired' },
  ];

  const actionTiles = [
    ...(primary ? [{ label: primary.label, icon: ArrowLeftRight, onClick: () => act(primary.action, asset), primary: true }] : []),
    ...(canEdit ? [{ label: 'Edit', icon: Pencil, onClick: () => act('edit', asset) }] : []),
    { label: 'Label', icon: Printer, onClick: () => setLabelOpen(true) },
    ...(can('maintenance.manage') ? [{ label: asset.status === 'repair' ? 'Repair' : 'Issue', icon: Wrench, onClick: () => act('repair', asset) }] : []),
    ...(mine && !can('maintenance.manage') ? [{ label: 'Report', icon: AlertTriangle, onClick: () => setReporting(true) }] : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={staff ? [{ label: 'Assets', to: '/assets' }, { label: titleCase(asset.category), to: `/assets?category=${asset.category?.toLowerCase()}` }, { label: asset.assetTag }] : [{ label: 'My assets', to: '/me' }, { label: asset.assetTag }]}
        title={
          <span className="flex items-center gap-4">
            <AssetThumb category={asset.category} asset={asset} size="xl" className="hidden sm:inline-flex" />
            <AssetThumb category={asset.category} asset={asset} size="lg" className="sm:hidden" />
            <span className="min-w-0">
              <span className="block truncate">{asset.name}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-normal tracking-normal text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{asset.assetTag}</span>
                <span>S/N {asset.serialNumber || '—'}</span>
                <StatusBadge status={asset.status} />
                <span className="hidden sm:inline">Condition: {titleCase(asset.condition)}</span>
              </span>
            </span>
          </span>
        }
        actions={
          <div className="hidden items-center gap-2 md:flex">
            {canEdit && (
              <Button variant="secondary" onClick={() => act('edit', asset)}>
                <Pencil /> Edit
              </Button>
            )}
            <Button variant="secondary" onClick={() => setLabelOpen(true)}>
              <Printer /> Print label
            </Button>
            {primary && (
              <Button onClick={() => act(primary.action, asset)}>
                <ArrowLeftRight /> {primary.label}
              </Button>
            )}
            {mine && (
              <Button variant="secondary" onClick={() => setReporting(true)}>
                <AlertTriangle /> Report a problem
              </Button>
            )}
            {canEdit && <AssetRowMenu asset={asset} onAction={act} trigger={<Button variant="secondary" size="icon" aria-label="More actions"><MoreHorizontal /></Button>} />}
          </div>
        }
      />

      {/* Phone action tiles */}
      <div className={cn('grid gap-2 md:hidden', actionTiles.length === 4 ? 'grid-cols-4' : actionTiles.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {actionTiles.map((t) => (
          <button
            key={t.label}
            onClick={t.onClick}
            className={cn('flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium active:scale-[0.98]', t.primary ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </button>
        ))}
      </div>

      <ViewTabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'activity', label: 'Activity' },
          { value: 'maintenance', label: 'Maintenance & AMC' },
          { value: 'files', label: 'Files' },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <SectionCard title="Lifecycle" action={retireBy && <span className="text-xs text-muted-foreground">Est. replacement {formatDate(retireBy, 'MMM yyyy')}</span>}>
              <ol className="grid grid-cols-4">
                {steps.map((s, i) => (
                  <li key={s.label} className="min-w-0">
                    <div className="flex items-center">
                      <span
                        className={cn(
                          'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full',
                          s.current ? 'bg-primary ring-4 ring-primary/15' : s.done ? 'bg-primary text-primary-foreground' : 'bg-muted',
                        )}
                      >
                        {s.done && !s.current && <Check className="h-3 w-3" />}
                      </span>
                      {i < steps.length - 1 && <span className={cn('h-0.5 flex-1', s.done || s.current ? 'bg-primary' : 'bg-border')} />}
                    </div>
                    <p className={cn('mt-2 truncate pr-2 text-[13px] font-medium', !s.done && !s.current && 'text-muted-foreground')}>{s.label}</p>
                    <p className="truncate pr-2 text-xs text-faint">{s.sub}</p>
                  </li>
                ))}
              </ol>
            </SectionCard>

            <SectionCard title="Activity" action={<button onClick={() => setTab('activity')} className="text-[13px] font-medium text-link hover:underline">View all</button>}>
              <div className="mb-4">
                <NoteComposer asset={asset} />
              </div>
              <AssetTimeline asset={asset} limit={6} />
            </SectionCard>

            {asset.notes && (
              <SectionCard title="Notes">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{asset.notes}</p>
              </SectionCard>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <ModelPhotoCard asset={asset} />

            <SectionCard title="Properties" action={canEdit && <button onClick={() => act('edit', asset)} className="text-[13px] font-medium text-link hover:underline">Edit</button>}>
              <div className="space-y-3">
                <KeyValue icon={Layers} label="Category">{titleCase(asset.category)}</KeyValue>
                <KeyValue icon={Tag} label="Model">{[asset.brand, asset.model].filter(Boolean).join(' ') || '—'}</KeyValue>
                <KeyValue icon={MapPin} label="Location">{displayLocation(asset.location)}</KeyValue>
                <KeyValue icon={CalendarDays} label="Purchased">{formatDate(asset.purchaseDate)}</KeyValue>
                <KeyValue icon={Building2} label="Vendor">{asset.vendor || '—'}</KeyValue>
                {invoice && (
                  <KeyValue icon={Receipt} label="Invoice">
                    <Link to={`/purchases?invoice=${invoice.id}`} className="text-link hover:underline">
                      {invoice.invoiceNumber || 'View'} · {formatDate(invoice.invoiceDate)}
                    </Link>
                  </KeyValue>
                )}
                {can('costs.view') && <KeyValue icon={Wallet} label="Cost / book value">
                  {formatMoney(asset.purchaseCost, currency)}
                  {bv && <span className="text-muted-foreground"> / {formatMoney(bv.value, currency)}</span>}
                </KeyValue>}
                <KeyValue icon={ShieldCheck} label="Warranty">{asset.warrantyEnd ? `Until ${formatDate(asset.warrantyEnd)}` : '—'}</KeyValue>
              </div>
            </SectionCard>

            <SectionCard
              title="Assigned to"
              action={!can('assets.checkout') ? null : asset.status === 'assigned' ? <button onClick={() => act('return', asset)} className="text-[13px] font-medium text-link hover:underline">Check in</button> : asset.status === 'available' ? <button onClick={() => act('assign', asset)} className="text-[13px] font-medium text-link hover:underline">Check out</button> : null}
            >
              {asset.assignedTo ? (
                <div className="flex items-center gap-3">
                  <PersonAvatar name={asset.assignedTo} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{asset.assignedTo}</p>
                    <p className="text-xs text-muted-foreground">{displayLocation(asset.location)}</p>
                  </div>
                  {asset.assignedToId && <CardLink to={`/people/${asset.assignedToId}`}>Profile</CardLink>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{asset.status === 'available' ? 'In stock — ready to check out.' : 'Not assigned.'}</p>
              )}
            </SectionCard>

            <CoverageCard title="AMC" start={asset.amcStartDate} end={asset.amcEndDate} contractId={asset.amcContractId} action={!asset.amcContractId && canEdit && <button onClick={() => act('edit', asset)} className="text-[13px] font-medium text-link hover:underline">Renew</button>} />

            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-lg border">
                <QrCode className="h-9 w-9" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Asset label</p>
                <p className="text-xs text-muted-foreground">Scan to open this asset</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setLabelOpen(true)}>
                <Printer /> Print
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <SectionCard title="Full history">
          <div className="mb-4">
            <NoteComposer asset={asset} />
          </div>
          <AssetTimeline asset={asset} />
        </SectionCard>
      )}

      {tab === 'maintenance' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CoverageCard title="AMC" start={asset.amcStartDate} end={asset.amcEndDate} contractId={asset.amcContractId} action={!asset.amcContractId && canEdit && <button onClick={() => act('edit', asset)} className="text-[13px] font-medium text-link hover:underline">Update</button>} />
          <CoverageCard title="Warranty" start={asset.warrantyStart} end={asset.warrantyEnd} contractId={asset.warrantyContractId} />
          <SectionCard title="Repair" className="md:col-span-2" action={can('maintenance.manage') && <Button size="sm" variant="secondary" onClick={() => act('repair', asset)}><Wrench /> {asset.status === 'repair' ? 'Complete repair' : 'Send for repair'}</Button>}>
            {asset.status === 'repair' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KeyValue label="Vendor">{asset.repairVendor || '—'}</KeyValue>
                <KeyValue label="Expected back">{formatDate(asset.repairEstReturn)}</KeyValue>
                {can('costs.view') && <KeyValue label="Estimated cost">{formatMoney(asset.repairCost, currency)}</KeyValue>}
                {asset.repairNotes && <p className="text-sm text-muted-foreground sm:col-span-3">{asset.repairNotes}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not in repair. Past repairs appear in the Activity tab.</p>
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'files' && (
        <SectionCard title="Files">
          <AssetFilesPanel asset={asset} />
        </SectionCard>
      )}

      {dialogs}
      <LabelDialog asset={asset} open={labelOpen} onOpenChange={setLabelOpen} />
      <ReportProblemDialog asset={asset} open={reporting} onOpenChange={setReporting} />
    </div>
  );
}

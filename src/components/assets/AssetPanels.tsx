import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  MessageSquare,
  Eye,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useAssetAssignments } from '@/hooks/useSupabaseData';
import { useAccess, useAssetNotes, useContracts, useDeleteAssetNote } from '@/hooks/useCollab';
import { COVERAGE_META } from '@/lib/contracts';
import type { Asset, Assignment, AssignmentEventType } from '@/types/asset';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { AssetThumb, Field, PersonAvatar, ProgressBar, StatusBadge, toneClasses } from '@/components/app/primitives';
import { ViewTabs } from '@/components/app/controls';
import { bookValue, coverage, displayLocation, formatDate, formatMoney, titleCase, type Tone } from '@/lib/assetMeta';
import { cn } from '@/lib/utils';
import { primaryAction, type AssetAction } from './useAssetActions';

/* ---------------- Row actions menu (context-aware) ---------------- */

export function AssetRowMenu({
  asset,
  onAction,
  onView,
  align = 'end',
  trigger,
}: {
  asset: Asset;
  onAction: (a: AssetAction, asset: Asset) => void;
  onView?: () => void;
  align?: 'start' | 'end';
  trigger?: React.ReactNode;
}) {
  const { can } = useAccess();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger ?? (
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${asset.name}`}>
            <MoreHorizontal />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} onClick={(e) => e.stopPropagation()}>
        {onView && (
          <DropdownMenuItem onSelect={onView}>
            <Eye /> Quick view
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to={`/assets/${asset.id}`}>
            <ArrowUpRight /> Open full page
          </Link>
        </DropdownMenuItem>
        {can('assets.edit') && (
          <>
            <DropdownMenuItem onSelect={() => onAction('edit', asset)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction('clone', asset)}>
              <Copy /> Duplicate
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        {asset.status === 'available' && can('assets.checkout') && (
          <DropdownMenuItem onSelect={() => onAction('assign', asset)}>
            <ArrowLeftRight /> Check out
          </DropdownMenuItem>
        )}
        {asset.status === 'assigned' && can('assets.checkout') && (
          <DropdownMenuItem onSelect={() => onAction('return', asset)}>
            <ArrowLeftRight /> Check in
          </DropdownMenuItem>
        )}
        {(asset.status === 'available' || asset.status === 'assigned' || asset.status === 'repair') && can('maintenance.manage') && (
          <DropdownMenuItem onSelect={() => onAction('repair', asset)}>
            <Wrench /> {asset.status === 'repair' ? 'Complete repair' : 'Send for repair'}
          </DropdownMenuItem>
        )}
        {!can('assets.edit') ? null : asset.status === 'lost' ? (
          <DropdownMenuItem onSelect={() => onAction('lost', asset)}>
            <CheckCircle2 /> Mark found
          </DropdownMenuItem>
        ) : (
          asset.status !== 'retired' && (
            <DropdownMenuItem onSelect={() => onAction('lost', asset)}>
              <AlertTriangle /> Mark lost
            </DropdownMenuItem>
          )
        )}
        {can('assets.delete') && <DropdownMenuSeparator />}
        {can('assets.delete') && <DropdownMenuItem onSelect={() => onAction('delete', asset)} className="text-destructive-strong focus:text-destructive-strong [&_svg]:text-destructive-strong">
          <Trash2 /> Delete
        </DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------- Activity timeline ---------------- */

const EVENT_META: Record<AssignmentEventType, { icon: LucideIcon; tone: Tone; title: (a: Assignment) => string }> = {
  assign: { icon: ArrowLeftRight, tone: 'info', title: (a) => `Checked out to ${a.employeeName || 'someone'}` },
  return: { icon: ArrowLeftRight, tone: 'quiet', title: (a) => `Returned${a.employeeName ? ` by ${a.employeeName}` : ''}` },
  repair_start: { icon: Wrench, tone: 'warning', title: () => 'Sent for repair' },
  repair_end: { icon: CheckCircle2, tone: 'success', title: () => 'Repair completed' },
  lost: { icon: AlertTriangle, tone: 'destructive', title: () => 'Marked lost' },
  found: { icon: Search, tone: 'success', title: () => 'Found' },
};

export function AssetTimeline({ asset, limit }: { asset: Asset; limit?: number }) {
  const { data: events = [], isLoading } = useAssetAssignments(asset.id);
  const { data: notes = [] } = useAssetNotes(asset.id);
  const { access } = useAccess();
  const delNote = useDeleteAssetNote(asset.id);
  const sorted = [...events].sort((a, b) => (b.assignedDate || '').localeCompare(a.assignedDate || ''));
  const rows: { key: string; icon: LucideIcon; tone: Tone; title: string; sub?: string; date?: string; noteId?: string; mine?: boolean }[] = sorted.map((e) => {
    const meta = EVENT_META[e.eventType] ?? EVENT_META.assign;
    const sub = [
      e.handedOverBy && e.eventType === 'assign' ? `by ${e.handedOverBy}` : null,
      e.receivedBy && e.eventType === 'return' ? `received by ${e.receivedBy}` : null,
      e.condition ? `condition ${titleCase(e.condition)}` : null,
      e.notes || null,
    ]
      .filter(Boolean)
      .join(' · ');
    return { key: e.id, icon: meta.icon, tone: meta.tone, title: meta.title(e), sub, date: e.assignedDate };
  });
  notes.forEach((n) => rows.push({ key: `note-${n.id}`, icon: MessageSquare, tone: 'special', title: `${n.authorName || 'Someone'} added a note`, sub: n.body, date: n.createdAt, noteId: n.id, mine: n.authorId === access?.userId }));
  rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  rows.push({ key: 'created', icon: Plus, tone: 'quiet', title: 'Added to register', sub: asset.vendor ? `from ${asset.vendor}` : undefined, date: asset.createdAt });
  const shown = limit ? rows.slice(0, limit) : rows;

  if (isLoading) return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}</div>;
  return (
    <ol className="relative">
      {shown.map((r, i) => (
        <li key={r.key} className="flex gap-3.5">
          <div className="flex flex-col items-center">
            <span className={cn('flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full', toneClasses(r.tone).bubble)}>
              <r.icon className="h-[15px] w-[15px]" />
            </span>
            {i < shown.length - 1 && <span className="my-1 w-0.5 flex-1 bg-border" />}
          </div>
          <div className={cn('min-w-0 flex-1 pt-1', i < shown.length - 1 && 'pb-4')}>
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm font-medium">{r.title}</p>
              <time className="shrink-0 text-xs text-faint">{formatDate(r.date)}</time>
            </div>
            {r.sub && <p className={cn('mt-0.5 text-[13px]', r.noteId ? 'whitespace-pre-wrap rounded-lg bg-subtle px-3 py-2 text-foreground' : 'text-muted-foreground')}>{r.sub}</p>}
            {r.noteId && r.mine && (
              <button onClick={() => delNote.mutate(r.noteId!)} className="mt-1 text-xs text-faint hover:text-destructive-strong">
                Delete
              </button>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------------- Cards shared by drawer & detail page ---------------- */

export function CoverageCard({ title, start, end, action, contractId }: { title: string; start?: string; end?: string; action?: React.ReactNode; contractId?: string }) {
  const c = coverage(start, end);
  const { data: contracts = [] } = useContracts();
  const contract = contractId ? contracts.find((x) => x.id === contractId) : undefined;
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-faint" />
        <p className="flex-1 text-sm font-semibold">{title}</p>
        {action}
      </div>
      {c ? (
        <>
          <ProgressBar value={c.pct} tone={c.tone} />
          <p className={cn('mt-2 text-xs', c.tone === 'success' ? 'text-muted-foreground' : toneClasses(c.tone).pill.split(' ')[1])}>
            {formatDate(start)} → {formatDate(end)} · {c.label}
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Not covered</p>
      )}
      {contract && (
        <div className="mt-3 space-y-1 border-t pt-3 text-xs">
          <p className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">{contract.vendor}</span>
            <Link to={`/maintenance?tab=contracts&contract=${contract.id}`} className="shrink-0 font-medium text-link hover:underline">Contract</Link>
          </p>
          <p className="text-muted-foreground">
            {COVERAGE_META[contract.coverage].label} — {COVERAGE_META[contract.coverage].hint.toLowerCase()}
            {contract.reference ? <> · <span className="font-mono">{contract.reference}</span></> : null}
          </p>
          {contract.supportContact && <p className="truncate text-muted-foreground">Support: {contract.supportContact}</p>}
        </div>
      )}
    </div>
  );
}

function AssetDetailsGrid({ asset, currency }: { asset: Asset; currency?: string }) {
  const bv = bookValue(asset);
  const { can } = useAccess();
  const costs = can('costs.view');
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
      <Field label="Category">{titleCase(asset.category)}</Field>
      <Field label="Model">{[asset.brand, asset.model].filter(Boolean).join(' ') || '—'}</Field>
      <Field label="Location">{displayLocation(asset.location)}</Field>
      <Field label="Condition">{titleCase(asset.condition)}</Field>
      <Field label="Purchase date">{formatDate(asset.purchaseDate)}</Field>
      {costs && <Field label="Purchase cost">{formatMoney(asset.purchaseCost, currency)}</Field>}
      <Field label="Vendor">{asset.vendor || '—'}</Field>
      {costs && <Field label="Book value">{bv ? `${formatMoney(bv.value, currency)} (${bv.depreciatedPct}% dep.)` : '—'}</Field>}
    </div>
  );
}

/* ---------------- Quick-view drawer (desktop & tablet) ---------------- */

export function AssetQuickView({
  asset,
  open,
  onOpenChange,
  onAction,
  currency,
}: {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAction: (a: AssetAction, asset: Asset) => void;
  currency?: string;
}) {
  const [tab, setTab] = React.useState<'overview' | 'activity'>('overview');
  const { can } = useAccess();
  React.useEffect(() => setTab('overview'), [asset?.id]);
  if (!asset) return null;
  const p0 = primaryAction(asset.status);
  const primary = p0 && (p0.action === 'repair' ? can('maintenance.manage') : can('assets.checkout')) ? p0 : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="space-y-4 px-6 pt-5">
          <div className="flex items-center gap-3.5 pr-16">
            <AssetThumb category={asset.category} asset={asset} size="lg" />
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg">{asset.name}</SheetTitle>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono text-foreground">{asset.assetTag}</span>· S/N {asset.serialNumber || '—'}
              </p>
            </div>
          </div>
          <Link to={`/assets/${asset.id}`} className="absolute right-12 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Open full page">
            <ArrowUpRight className="h-[18px] w-[18px]" />
          </Link>
          <div className="flex items-center gap-2">
            <StatusBadge status={asset.status} />
            <span className="text-xs text-muted-foreground">{titleCase(asset.condition)} condition · {titleCase(asset.category)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {primary && (
              <Button size="sm" onClick={() => onAction(primary.action, asset)}>
                <ArrowLeftRight /> {primary.label}
              </Button>
            )}
            {can('assets.edit') && (
              <Button size="sm" variant="secondary" onClick={() => onAction('edit', asset)}>
                <MapPin /> Move / edit
              </Button>
            )}
            <Button size="sm" variant="secondary" asChild>
              <Link to={`/assets/${asset.id}?print=label`}>
                <Printer /> Print label
              </Link>
            </Button>
            <AssetRowMenu asset={asset} onAction={onAction} trigger={<Button size="icon-sm" variant="secondary" aria-label="More actions"><MoreHorizontal /></Button>} />
          </div>
          <ViewTabs<'overview' | 'activity'> tabs={[{ value: 'overview', label: 'Overview' }, { value: 'activity', label: 'Activity' }]} value={tab} onChange={setTab} />
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto bg-subtle/60 px-6 py-5">
          {tab === 'overview' ? (
            <>
              {asset.assignedTo && (
                <div className="rounded-xl border bg-card p-4">
                  <p className="mb-2.5 text-2xs font-semibold uppercase tracking-wider text-faint">Assigned to</p>
                  <div className="flex items-center gap-3">
                    <PersonAvatar name={asset.assignedTo} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{asset.assignedTo}</p>
                      <p className="text-xs text-muted-foreground">{displayLocation(asset.location)}</p>
                    </div>
                    {asset.assignedToId && (
                      <Link to={`/people/${asset.assignedToId}`} className="text-[13px] font-medium text-link hover:underline">
                        View profile
                      </Link>
                    )}
                  </div>
                </div>
              )}
              <div className="rounded-xl border bg-card p-4">
                <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-faint">Details</p>
                <AssetDetailsGrid asset={asset} currency={currency} />
              </div>
              <CoverageCard title="AMC" start={asset.amcStartDate} end={asset.amcEndDate} contractId={asset.amcContractId} />
              <CoverageCard title="Warranty" start={asset.warrantyStart} end={asset.warrantyEnd} contractId={asset.warrantyContractId} />
              <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-lg border">
                  <QrCode className="h-9 w-9" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Asset label</p>
                  <p className="text-xs text-muted-foreground">QR links to this asset — scan to check in/out</p>
                </div>
                <Button size="sm" variant="secondary" asChild>
                  <Link to={`/assets/${asset.id}?print=label`}>
                    <Printer /> Print
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-card p-4">
              <AssetTimeline asset={asset} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

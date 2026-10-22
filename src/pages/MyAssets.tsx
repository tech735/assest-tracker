import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, FileSignature, Mail, Package, PackageOpen, Wrench } from 'lucide-react';
import { useAssets, useAssignments, useEmployees } from '@/hooks/useSupabaseData';
import { useAccess, useContracts, useHandoverDocuments } from '@/hooks/useCollab';
import type { Asset } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, PageLoader, Pill, SectionCard } from '@/components/app/primitives';
import { DeviceArt, deviceKind, type DeviceKind } from '@/components/app/DeviceArt';
import { docNumber } from '@/components/handover/HandoverDocumentView';
import { coverage, displayLocation, formatDate, titleCase } from '@/lib/assetMeta';

const IT_EMAIL = 'tech@kotu.co.in';
// Main devices first, accessories after.
const KIND_ORDER: DeviceKind[] = ['laptop', 'desktop', 'monitor', 'phone', 'tablet', 'printer', 'keyboard', 'mouse', 'headphones', 'bag', 'charger', 'box'];
const rank = (a: Asset) => KIND_ORDER.indexOf(deviceKind(a));

/** Employee self-service: what I hold and what I still need to sign. */
export default function MyAssets() {
  const { access, isLoading: l1 } = useAccess();
  const { data: employees = [], isLoading: l2 } = useEmployees();
  const { data: assets = [] } = useAssets();
  const { data: assignments = [] } = useAssignments();
  const { data: contracts = [] } = useContracts();
  const email = access?.email?.toLowerCase();
  const me = employees.find((e) => e.email?.toLowerCase() === email);
  const { data: docs = [] } = useHandoverDocuments({ email: access?.email || '' }, !!access?.email);

  const mine = useMemo(() => (me ? assets.filter((a) => a.status === 'assigned' && a.assignedToId === me.id).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)) : []), [assets, me]);
  // When each asset was handed to me: the latest check-out to me.
  const since = useMemo(() => {
    const m = new Map<string, { date: string; by?: string }>();
    if (!me) return m;
    assignments
      .filter((e) => e.eventType === 'assign' && e.employeeId === me.id)
      .forEach((e) => {
        const prev = m.get(e.assetId);
        if (!prev || e.assignedDate > prev.date) m.set(e.assetId, { date: e.assignedDate, by: e.handedOverBy });
      });
    return m;
  }, [assignments, me]);
  const vendorOf = useMemo(() => new Map(contracts.map((c) => [c.id, c.vendor])), [contracts]);

  if (l1 || l2) return <PageLoader label="Loading your assets" />;

  const pending = docs.filter((d) => d.status === 'pending');
  const firstName = (access?.name || me?.name || '').split(' ')[0];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="My assets"
        description={firstName ? `Hi ${firstName} — here’s everything IT has handed over to you.` : undefined}
        actions={mine.length > 0 && <Pill tone="info" dot={false}>{mine.length} item{mine.length === 1 ? '' : 's'}</Pill>}
      />

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((d) => (
            <Link key={d.id} to={`/sign/${d.id}`} className="flex items-center gap-3 rounded-xl bg-warning-soft px-4 py-3 text-warning-strong transition-opacity hover:opacity-90">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 text-sm font-medium">
                {d.kind === 'return' ? 'Return' : 'Handover'} form {docNumber(d)} is waiting for your signature ({d.items.length} item{d.items.length === 1 ? '' : 's'})
              </span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      )}

      {!me ? (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={PackageOpen} title="No employee record for your account" description={`IT hasn’t linked ${access?.email || 'your email'} to an employee yet. Contact ${IT_EMAIL}.`} />
        </div>
      ) : mine.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={Package} title="Nothing assigned" description="When IT hands you a device, it’ll show up here." />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 min-[1680px]:grid-cols-4">
          {mine.map((a) => (
            <li key={a.id}>
              <DeviceCard asset={a} since={since.get(a.id)} amcVendor={a.amcContractId ? vendorOf.get(a.amcContractId) : undefined} />
            </li>
          ))}
        </ul>
      )}

      <SectionCard title="Forms" bodyClassName="px-3 pb-3">
        {docs.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">No handover forms yet.</p>
        ) : (
          <ul>
            {docs.map((d) => (
              <li key={d.id}>
                <Link to={`/sign/${d.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-subtle">
                  <FileSignature className="h-5 w-5 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{docNumber(d)} · {d.kind === 'return' ? 'Return' : 'Handover'}</span>
                    <span className="block text-xs text-muted-foreground">{d.items.map((i) => i.name).join(', ')} · {formatDate(d.createdAt)}</span>
                  </span>
                  {d.status === 'signed' ? <Pill tone="success">Signed</Pill> : d.status === 'void' ? <Pill tone="quiet">Void</Pill> : <Pill tone="warning">To sign</Pill>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="flex items-start gap-2.5 rounded-xl bg-subtle px-4 py-3 text-[13px] text-muted-foreground">
        <Wrench className="mt-0.5 h-4 w-4 shrink-0" />
        Something broken or missing? Use “Report a problem” on the device, or email {IT_EMAIL} with the asset tag (on the label) and IT will log a repair.
      </div>
    </div>
  );
}

function DeviceCard({ asset: a, since, amcVendor }: { asset: Asset; since?: { date: string; by?: string }; amcVendor?: string }) {
  const warranty = coverage(a.warrantyStart || a.purchaseDate, a.warrantyEnd);
  const amc = coverage(a.amcStartDate, a.amcEndDate);
  const model = [a.brand, a.model].filter(Boolean).join(' ');
  const report = `mailto:${IT_EMAIL}?subject=${encodeURIComponent(`Problem with ${a.assetTag} (${a.name})`)}&body=${encodeURIComponent(`Asset: ${a.name}\nTag: ${a.assetTag}\nSerial: ${a.serialNumber || '—'}\n\nWhat’s wrong:\n`)}`;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-card-hover">
      <header className="flex items-center gap-2 px-4 pt-3.5">
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-muted-foreground">{titleCase(a.category) || 'Asset'}</p>
        <span className="font-mono text-xs text-muted-foreground">{a.assetTag}</span>
      </header>

      <Link to={`/assets/${a.id}`} className="mx-4 mt-3 flex h-40 items-center justify-center rounded-lg bg-gradient-to-b from-subtle to-muted/60 px-6 py-4" aria-label={`Open ${a.name}`}>
        <DeviceArt kind={deviceKind(a)} className="max-h-32 max-w-[220px] drop-shadow-sm" />
      </Link>

      <div className="flex flex-1 flex-col px-4 pb-1 pt-3.5">
        <h3 className="truncate text-lg font-semibold tracking-tight">{a.name}</h3>
        <p className="truncate text-[13px] text-muted-foreground">{model || titleCase(a.category)}</p>
        <Link to={`/assets/${a.id}`} className="mt-1 w-fit text-[13px] font-medium text-link hover:underline">See details</Link>

        <dl className="mt-3 space-y-1.5 border-t pt-3 text-[13px]">
          <div className="flex gap-2">
            <dt className="w-[86px] shrink-0 text-muted-foreground">Serial</dt>
            <dd className="min-w-0 truncate font-mono text-xs leading-5">{a.serialNumber || '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-[86px] shrink-0 text-muted-foreground">Received</dt>
            <dd className="min-w-0 truncate" title={since?.by ? `Handed over by ${since.by}` : undefined}>{since ? formatDate(since.date) : '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-[86px] shrink-0 text-muted-foreground">Location</dt>
            <dd className="min-w-0 truncate">{displayLocation(a.location)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-[86px] shrink-0 text-muted-foreground">Condition</dt>
            <dd className="min-w-0 truncate">{titleCase(a.condition)}</dd>
          </div>
        </dl>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {warranty ? (
            <Pill tone={warranty.days! < 0 ? 'quiet' : warranty.tone} dot={false}>{warranty.days! < 0 ? 'Warranty ended' : `Warranty until ${formatDate(a.warrantyEnd, 'MMM yyyy')}`}</Pill>
          ) : (
            <Pill tone="quiet" dot={false}>No warranty info</Pill>
          )}
          {amc && (
            <span title={amcVendor ? `AMC with ${amcVendor}` : undefined}>
              <Pill tone={amc.days! < 0 ? 'quiet' : 'info'} dot={false}>{amc.days! < 0 ? 'AMC ended' : `AMC until ${formatDate(a.amcEndDate, 'MMM yyyy')}`}</Pill>
            </span>
          )}
        </div>
      </div>

      <footer className="mt-3 flex border-t bg-subtle/60">
        <Button asChild variant="ghost" size="sm" className="h-11 flex-1 rounded-none text-[13px]">
          <a href={report}><Mail /> Report a problem</a>
        </Button>
      </footer>
    </article>
  );
}

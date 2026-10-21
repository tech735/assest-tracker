import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, FileSignature, Package, PackageOpen, Wrench } from 'lucide-react';
import { useAssets, useEmployees } from '@/hooks/useSupabaseData';
import { useAccess, useHandoverDocuments } from '@/hooks/useCollab';
import { AssetThumb, EmptyState, PageHeader, PageLoader, Pill, SectionCard, StatusBadge } from '@/components/app/primitives';
import { docNumber } from '@/components/handover/HandoverDocumentView';
import { formatDate } from '@/lib/assetMeta';

/** Employee self-service: what I hold and what I still need to sign. */
export default function MyAssets() {
  const { access, isLoading: l1 } = useAccess();
  const { data: employees = [], isLoading: l2 } = useEmployees();
  const { data: assets = [] } = useAssets();
  const email = access?.email?.toLowerCase();
  const me = employees.find((e) => e.email?.toLowerCase() === email);
  const { data: docs = [] } = useHandoverDocuments({ email: access?.email || '' }, !!access?.email);

  if (l1 || l2) return <PageLoader label="Loading your assets" />;

  const mine = me ? assets.filter((a) => a.status === 'assigned' && a.assignedToId === me.id) : [];
  const pending = docs.filter((d) => d.status === 'pending');
  const firstName = (access?.name || me?.name || '').split(' ')[0];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="My assets" description={firstName ? `Hi ${firstName} — here’s everything IT has handed over to you.` : undefined} />

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
          <EmptyState icon={PackageOpen} title="No employee record for your account" description={`IT hasn’t linked ${access?.email || 'your email'} to an employee yet. Contact tech@kotu.co.in.`} />
        </div>
      ) : (
        <SectionCard title={`Assigned to you (${mine.length})`} bodyClassName="px-3 pb-3">
          {mine.length === 0 ? (
            <EmptyState icon={Package} title="Nothing assigned" description="When IT hands you a device, it’ll show up here." className="py-8" />
          ) : (
            <ul>
              {mine.map((a) => (
                <li key={a.id}>
                  <Link to={`/assets/${a.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-subtle">
                    <AssetThumb category={a.category} size="lg" className="h-11 w-11" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.name}</span>
                      <span className="block truncate text-xs text-muted-foreground"><span className="font-mono">{a.assetTag}</span> · S/N {a.serialNumber}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
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
        Something broken or missing? Email tech@kotu.co.in with the asset tag (on the label) and IT will log a repair.
      </div>
    </div>
  );
}

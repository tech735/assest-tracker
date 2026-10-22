import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, FileSignature, ListChecks, MoreHorizontal, Pencil, Phone, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { Asset, ServiceContract } from '@/types/asset';
import { useAssets } from '@/hooks/useSupabaseData';
import { useAccess, useContracts, useDeleteContract } from '@/hooks/useCollab';
import { getAssetFileUrl } from '@/services/collabService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
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
import { AssetThumb, EmptyState, IconBubble, KeyValue, Pill, ProgressBar, StatusBadge } from '@/components/app/primitives';
import { ContractDialog } from './ContractDialog';
import { ContractAssetsDialog } from './ContractAssetsDialog';
import { COVERAGE_META, CONTRACT_KIND_LABEL, contractIdOf, contractTotal } from '@/lib/contracts';
import { coverage, displayLocation, formatDate, formatMoney } from '@/lib/assetMeta';

export function ContractsPanel() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { data: contracts = [], isLoading, error } = useContracts();
  const { data: assets = [] } = useAssets();
  const { can } = useAccess();
  const del = useDeleteContract();
  const canManage = can('maintenance.manage');
  const costs = can('costs.view');
  const [editing, setEditing] = React.useState<ServiceContract | null | undefined>(undefined); // undefined = closed, null = new
  const [picking, setPicking] = React.useState<ServiceContract | null>(null);
  const [deleting, setDeleting] = React.useState<ServiceContract | null>(null);

  const covered = React.useMemo(() => {
    const m = new Map<string, Asset[]>();
    assets.forEach((a) => {
      for (const id of [a.amcContractId, a.warrantyContractId]) if (id) m.set(id, [...(m.get(id) || []), a]);
    });
    return m;
  }, [assets]);

  const viewingId = params.get('contract');
  const viewing = contracts.find((c) => c.id === viewingId) || null;
  const view = (c: ServiceContract | null) => setParams(c ? { tab: 'contracts', contract: c.id } : { tab: 'contracts' }, { replace: true });

  const openDocument = async (c: ServiceContract) => {
    if (!c.documentPath) return;
    try {
      window.open(await getAssetFileUrl(c.documentPath), '_blank', 'noopener');
    } catch (e) {
      toast({ title: 'Couldn’t open the document', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  if (error)
    return <EmptyState icon={FileSignature} title="Contracts aren’t enabled yet" description="Apply migration 0014_service_contracts.sql in the Supabase SQL editor, then reload." className="py-12" />;
  if (isLoading) return <div className="h-40 animate-pulse bg-muted/50" />;

  const menu = (c: ServiceContract) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label="Contract actions" onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {c.documentPath && <DropdownMenuItem onSelect={() => openDocument(c)}><FileText /> Open invoice</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => setPicking(c)}><ListChecks /> Choose assets</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setEditing(c)}><Pencil /> Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setDeleting(c)} className="text-destructive-strong focus:text-destructive-strong [&_svg]:text-destructive-strong"><Trash2 /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <p className="flex-1 text-[13px] text-muted-foreground">AMC and warranty contracts with their terms. Assets on a contract inherit its dates and get reminder emails before it ends.</p>
        {canManage && <Button size="sm" onClick={() => setEditing(null)}><Plus /> Add contract</Button>}
      </div>

      {contracts.length === 0 ? (
        <EmptyState icon={FileSignature} title="No contracts yet" description="Add an AMC or vendor warranty, then choose the assets it covers." className="py-12" action={canManage && <Button onClick={() => setEditing(null)}><Plus /> Add contract</Button>} />
      ) : (
        <ul className="grid gap-3 p-4 lg:grid-cols-2">
          {contracts.map((c) => {
            const cov = coverage(c.startDate, c.endDate);
            const n = covered.get(c.id)?.length || 0;
            const total = contractTotal(c);
            return (
              <li key={c.id}>
                <div onClick={() => view(c)} className="h-full cursor-pointer space-y-3 rounded-xl border bg-card p-4 transition-colors hover:border-border-strong hover:bg-subtle/60">
                  <div className="flex items-start gap-3">
                    <IconBubble icon={c.kind === 'amc' ? FileSignature : ShieldCheck} tone={c.kind === 'amc' ? 'info' : 'special'} />
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={(e) => { e.stopPropagation(); view(c); }} className="block max-w-full truncate rounded text-left font-semibold outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/30">{c.vendor}</button>
                      <p className="truncate text-xs text-muted-foreground">
                        {CONTRACT_KIND_LABEL[c.kind]}{c.category ? ` · ${c.category}` : ''}{c.reference ? <> · <span className="font-mono">{c.reference}</span></> : null}
                      </p>
                    </div>
                    {canManage && menu(c)}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Pill tone={c.coverage === 'comprehensive' ? 'success' : 'info'} dot={false}>{COVERAGE_META[c.coverage].label}</Pill>
                    <Pill tone={n === 0 ? 'warning' : 'quiet'} dot={false}>{n}{c.units != null ? ` of ${c.units}` : ''} asset{(c.units ?? n) === 1 ? '' : 's'} linked</Pill>
                    {costs && total != null && <Pill tone="quiet" dot={false}>{formatMoney(total, c.currency)}</Pill>}
                  </div>
                  {cov && (
                    <div className="space-y-1">
                      <ProgressBar value={cov.pct} tone={cov.tone} />
                      <p className="text-xs text-muted-foreground">{formatDate(c.startDate)} → {formatDate(c.endDate)} · {cov.label}</p>
                    </div>
                  )}
                  {canManage && n === 0 && (
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setPicking(c); }}><ListChecks /> Choose the assets it covers</Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={!!viewing} onOpenChange={(o) => !o && view(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
          {viewing && (
            <ContractDetails
              contract={viewing}
              assets={covered.get(viewing.id) || []}
              currency={viewing.currency}
              costs={costs}
              canManage={canManage}
              onEdit={() => setEditing(viewing)}
              onPick={() => setPicking(viewing)}
              onOpenDocument={() => openDocument(viewing)}
            />
          )}
        </SheetContent>
      </Sheet>

      <ContractDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} contract={editing} onSaved={(c) => !editing && setPicking(c)} />
      <ContractAssetsDialog contract={picking} open={!!picking} onOpenChange={(o) => !o && setPicking(null)} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contract?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.vendor} {deleting && CONTRACT_KIND_LABEL[deleting.kind]} is removed with its invoice. Linked assets keep their current dates but are no longer tied to it.
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
                  if (viewingId === deleting.id) view(null);
                  toast({ title: 'Contract deleted' });
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
    </>
  );
}

function ContractDetails({
  contract: c,
  assets,
  currency,
  costs,
  canManage,
  onEdit,
  onPick,
  onOpenDocument,
}: {
  contract: ServiceContract;
  assets: Asset[];
  currency: string;
  costs: boolean;
  canManage: boolean;
  onEdit: () => void;
  onPick: () => void;
  onOpenDocument: () => void;
}) {
  const cov = coverage(c.startDate, c.endDate);
  const total = contractTotal(c);
  const sorted = [...assets].filter((a) => contractIdOf(a, c.kind) === c.id).sort((a, b) => a.assetTag.localeCompare(b.assetTag));
  return (
    <>
      <div className="space-y-4 border-b px-6 pb-4 pt-5">
        <div className="flex items-center gap-3.5 pr-10">
          <IconBubble icon={c.kind === 'amc' ? FileSignature : ShieldCheck} tone={c.kind === 'amc' ? 'info' : 'special'} size="lg" />
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg">{c.vendor}</SheetTitle>
            <p className="truncate text-xs text-muted-foreground">
              {CONTRACT_KIND_LABEL[c.kind]}{c.category ? ` · ${c.category}` : ''}{c.reference ? <> · <span className="font-mono">{c.reference}</span></> : null}
            </p>
          </div>
        </div>
        {cov && (
          <div className="space-y-1">
            <ProgressBar value={cov.pct} tone={cov.tone} />
            <p className="text-xs text-muted-foreground">{formatDate(c.startDate)} → {formatDate(c.endDate)} · {cov.label}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {c.documentPath && <Button size="sm" variant="secondary" onClick={onOpenDocument}><FileText /> Invoice</Button>}
          {canManage && <Button size="sm" variant="secondary" onClick={onPick}><ListChecks /> Choose assets</Button>}
          {canManage && <Button size="sm" variant="secondary" onClick={onEdit}><Pencil /> Edit</Button>}
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
        <div className="space-y-3">
          <KeyValue label="Coverage">
            {COVERAGE_META[c.coverage].label}
            <span className="block text-xs font-normal text-muted-foreground">{COVERAGE_META[c.coverage].hint}</span>
          </KeyValue>
          {c.covers && <KeyValue label="Covered">{c.covers}</KeyValue>}
          {c.excludes && <KeyValue label="Billed extra">{c.excludes}</KeyValue>}
          {c.supportContact && <KeyValue icon={Phone} label="Support">{c.supportContact}</KeyValue>}
          {costs && (c.units != null || total != null) && (
            <KeyValue label="Cost">
              {c.units != null && c.rate != null ? `${c.units} × ${formatMoney(c.rate, currency)}${c.taxPercent ? ` + ${c.taxPercent}% GST` : ''} = ` : ''}
              {formatMoney(total, currency)}
            </KeyValue>
          )}
          {c.notes && <p className="whitespace-pre-wrap rounded-lg bg-subtle px-3 py-2 text-[13px] text-muted-foreground">{c.notes}</p>}
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">
            Assets covered <span className="font-normal text-muted-foreground">· {sorted.length}{c.units != null ? ` of ${c.units}` : ''}</span>
          </p>
          {sorted.length ? (
            sorted.map((a) => (
              <Link key={a.id} to={`/assets/${a.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-subtle">
                <AssetThumb category={a.category} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.name}</span>
                  <span className="block truncate text-xs text-muted-foreground"><span className="font-mono">{a.assetTag}</span> · {a.assignedTo || displayLocation(a.location)}</span>
                </span>
                <StatusBadge status={a.status} />
              </Link>
            ))
          ) : (
            <p className="text-[13px] text-muted-foreground">None yet{canManage ? ' — use “Choose assets”.' : '.'}</p>
          )}
        </div>
      </div>
    </>
  );
}

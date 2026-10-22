import * as React from 'react';
import type { ServiceContract } from '@/types/asset';
import { useAssets } from '@/hooks/useSupabaseData';
import { useAddAssetsToContract, useContracts, useRemoveAssetsFromContract } from '@/hooks/useCollab';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchField } from '@/components/app/controls';
import { AssetThumb, Pill, StatusBadge } from '@/components/app/primitives';
import { CONTRACT_KIND_LABEL, contractIdOf, sameCategory } from '@/lib/contracts';
import { displayLocation } from '@/lib/assetMeta';
import { cn } from '@/lib/utils';

const SHOW = 200;

/** Pick the assets a contract covers. Ticking links them (and sets their dates); unticking unlinks. */
export function ContractAssetsDialog({ contract, open, onOpenChange }: { contract: ServiceContract | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const { data: assets = [] } = useAssets();
  const { data: contracts = [] } = useContracts();
  const add = useAddAssetsToContract();
  const remove = useRemoveAssetsFromContract();
  const [q, setQ] = React.useState('');
  const [onlyType, setOnlyType] = React.useState(true);
  const [onlySelected, setOnlySelected] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const linked = React.useMemo(() => (contract ? new Set(assets.filter((a) => contractIdOf(a, contract.kind) === contract.id).map((a) => a.id)) : new Set<string>()), [assets, contract]);
  React.useEffect(() => {
    if (open) {
      setSelected(new Set(linked));
      setQ('');
      setOnlyType(!!contract?.category);
      setOnlySelected(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract?.id]);

  const vendorOf = React.useMemo(() => new Map(contracts.map((c) => [c.id, c.vendor])), [contracts]);
  const list = React.useMemo(() => {
    if (!contract) return [];
    const term = q.trim().toLowerCase();
    return assets
      .filter((a) => a.status !== 'retired' || linked.has(a.id))
      .filter((a) => !onlyType || !contract.category || sameCategory(a.category, contract.category))
      .filter((a) => !onlySelected || selected.has(a.id))
      .filter((a) => !term || [a.name, a.assetTag, a.serialNumber, a.brand, a.model, a.assignedTo].some((v) => v?.toLowerCase().includes(term)))
      .sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)) || a.assetTag.localeCompare(b.assetTag));
    // `selected` is left out on purpose so rows don't jump while ticking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, contract, q, onlyType, onlySelected, linked]);

  if (!contract) return null;
  const toAdd = [...selected].filter((id) => !linked.has(id));
  const toRemove = [...linked].filter((id) => !selected.has(id));
  const over = contract.units != null && selected.size > contract.units;
  const toggle = (id: string, on: boolean) => setSelected((s) => {
    const n = new Set(s);
    if (on) n.add(id);
    else n.delete(id);
    return n;
  });

  const save = async () => {
    try {
      if (toAdd.length) await add.mutateAsync({ contract, ids: toAdd });
      if (toRemove.length) await remove.mutateAsync({ contract, ids: toRemove });
      toast({ title: 'Coverage updated', description: `${selected.size} asset${selected.size === 1 ? '' : 's'} on ${contract.vendor} ${CONTRACT_KIND_LABEL[contract.kind]}.` });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Couldn’t update coverage', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-[640px]">
        <DialogHeader className="space-y-1 px-6 pb-3 pt-5">
          <DialogTitle>Assets covered</DialogTitle>
          <DialogDescription>
            {contract.vendor} {CONTRACT_KIND_LABEL[contract.kind]}
            {contract.reference ? <> · <span className="font-mono">{contract.reference}</span></> : null}. Ticked assets get this contract’s dates.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y bg-subtle px-6 py-2.5">
          <SearchField value={q} onChange={setQ} placeholder="Search tag, serial, name or holder" className="min-w-[200px] flex-1" autoFocus />
          {contract.category && (
            <label className="flex items-center gap-2 text-[13px]">
              <Switch checked={onlyType} onCheckedChange={setOnlyType} /> Only {contract.category}
            </label>
          )}
          <label className="flex items-center gap-2 text-[13px]">
            <Switch checked={onlySelected} onCheckedChange={setOnlySelected} /> Ticked only
          </label>
        </div>
        <ul className="min-h-[200px] flex-1 divide-y overflow-y-auto">
          {list.slice(0, SHOW).map((a) => {
            const on = selected.has(a.id);
            const other = contractIdOf(a, contract.kind);
            const elsewhere = other && other !== contract.id ? vendorOf.get(other) : undefined;
            return (
              <li key={a.id}>
                <label className={cn('flex cursor-pointer items-center gap-3 px-6 py-2.5 hover:bg-subtle', on && 'bg-primary/[0.04]')}>
                  <Checkbox checked={on} onCheckedChange={(c) => toggle(a.id, c === true)} aria-label={`Cover ${a.assetTag}`} />
                  <AssetThumb category={a.category} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="font-mono">{a.assetTag}</span> · S/N {a.serialNumber || '—'} · {a.assignedTo || displayLocation(a.location)}
                    </span>
                  </span>
                  {elsewhere && !on && <Pill tone="quiet" dot={false} className="hidden sm:inline-flex">On {elsewhere}</Pill>}
                  {elsewhere && on && <Pill tone="warning" dot={false} className="hidden sm:inline-flex">Moves from {elsewhere}</Pill>}
                  <StatusBadge status={a.status} className="hidden md:inline-flex" />
                </label>
              </li>
            );
          })}
          {list.length === 0 && <li className="px-6 py-10 text-center text-sm text-muted-foreground">No matching assets.</li>}
          {list.length > SHOW && <li className="px-6 py-3 text-center text-xs text-muted-foreground">Showing {SHOW} of {list.length} — search to narrow down.</li>}
        </ul>
        <DialogFooter className="items-center border-t px-6 py-3">
          <p className={cn('mr-auto text-[13px]', over ? 'font-medium text-warning-strong' : 'text-muted-foreground')}>
            {selected.size}
            {contract.units != null ? ` of ${contract.units} units` : ' selected'}
            {over ? ' — more than the contract covers' : ''}
            {toAdd.length || toRemove.length ? ` · ${toAdd.length ? `+${toAdd.length}` : ''}${toAdd.length && toRemove.length ? ' ' : ''}${toRemove.length ? `−${toRemove.length}` : ''}` : ''}
          </p>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={save} disabled={!toAdd.length && !toRemove.length} loading={add.isPending || remove.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

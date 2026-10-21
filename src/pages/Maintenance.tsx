import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { AlertTriangle, CheckCircle2, Download, History, Info, ShieldCheck, Wrench } from 'lucide-react';
import { useAssets, useAssignments, useSettings } from '@/hooks/useSupabaseData';
import type { Asset } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { KpiCard, Segmented, ViewTabs } from '@/components/app/controls';
import { AssetThumb, EmptyState, PageHeader, PageLoader, Pill, ProgressBar } from '@/components/app/primitives';
import { useAssetActions } from '@/components/assets/useAssetActions';
import { BulkAmcUpdateDialog } from '@/components/assets/BulkAmcUpdateDialog';
import { coverage, daysUntil, displayLocation, formatDate, formatMoney, type Tone } from '@/lib/assetMeta';
import { exportToCSV } from '@/lib/exportUtils';

type Tab = 'amc' | 'repairs' | 'warranty';
type Window = 'all' | 'expiring' | 'expired';

export default function Maintenance() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') || 'amc') as Tab;
  const { data: assets = [], isLoading } = useAssets();
  const { data: assignments = [] } = useAssignments();
  const { data: settings } = useSettings();
  const { open: act, dialogs } = useAssetActions();
  const [windowF, setWindowF] = useState<Window>('expiring');
  const [renewing, setRenewing] = useState<Asset | null>(null);

  const data = useMemo(() => {
    const amc = assets.filter((a) => a.amcEndDate).sort((a, b) => a.amcEndDate!.localeCompare(b.amcEndDate!));
    const warranty = assets.filter((a) => a.warrantyEnd && a.status !== 'retired').sort((a, b) => a.warrantyEnd!.localeCompare(b.warrantyEnd!));
    const repairs = assets.filter((a) => a.status === 'repair');
    const repairStart = new Map<string, string>();
    assignments.filter((e) => e.eventType === 'repair_start').forEach((e) => {
      const prev = repairStart.get(e.assetId);
      if (!prev || e.assignedDate > prev) repairStart.set(e.assetId, e.assignedDate);
    });
    // Turnaround: pair each repair_end with the latest earlier repair_start for the same asset
    const turnarounds: number[] = [];
    const byAsset = new Map<string, typeof assignments>();
    assignments.forEach((e) => (e.eventType === 'repair_start' || e.eventType === 'repair_end') && byAsset.set(e.assetId, [...(byAsset.get(e.assetId) || []), e]));
    byAsset.forEach((evs) => {
      const sorted = [...evs].sort((a, b) => a.assignedDate.localeCompare(b.assignedDate));
      let start: string | null = null;
      for (const e of sorted) {
        if (e.eventType === 'repair_start') start = e.assignedDate;
        else if (start) {
          turnarounds.push(Math.max(0, differenceInCalendarDays(parseISO(e.assignedDate), parseISO(start))));
          start = null;
        }
      }
    });
    const expiring = (end?: string) => {
      const d = daysUntil(end);
      return d !== null && d >= 0 && d <= 30;
    };
    return {
      amc,
      warranty,
      repairs,
      repairStart,
      amcSoon: amc.filter((a) => expiring(a.amcEndDate)),
      warrantySoon: warranty.filter((a) => expiring(a.warrantyEnd)),
      lateRepairs: repairs.filter((a) => (daysUntil(a.repairEstReturn) ?? 1) < 0),
      avgTat: turnarounds.length ? turnarounds.reduce((s, n) => s + n, 0) / turnarounds.length : null,
      repairCost: repairs.reduce((s, a) => s + (a.repairCost || 0), 0),
    };
  }, [assets, assignments]);

  if (isLoading) return <PageLoader label="Loading maintenance" />;

  const filterWindow = (list: Asset[], end: (a: Asset) => string | undefined) =>
    list.filter((a) => {
      const d = daysUntil(end(a));
      if (windowF === 'expiring') return d !== null && d >= 0 && d <= 30;
      if (windowF === 'expired') return d !== null && d < 0;
      return true;
    });
  const stateOf = (end?: string): { tone: Tone; label: string } => {
    const d = daysUntil(end);
    if (d === null) return { tone: 'quiet', label: '—' };
    if (d < 0) return { tone: 'quiet', label: 'Expired' };
    if (d <= 30) return { tone: d <= 7 ? 'destructive' : 'warning', label: 'Expiring' };
    return { tone: 'success', label: 'Active' };
  };

  const coverageRows = (list: Asset[], startOf: (a: Asset) => string | undefined, endOf: (a: Asset) => string | undefined, renew: boolean) =>
    list.length === 0 ? (
      <EmptyState icon={ShieldCheck} title="Nothing in this window" description="Try “All” to see every contract." className="py-12" />
    ) : (
      <>
        {/* Phone cards */}
        <ul className="divide-y md:hidden">
          {list.map((a) => {
            const c = coverage(startOf(a), endOf(a));
            const st = stateOf(endOf(a));
            return (
              <li key={a.id} className="space-y-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link to={`/assets/${a.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground"><span className="font-mono">{a.assetTag}</span> · {a.assignedTo || displayLocation(a.location)}</p>
                  </Link>
                  <Pill tone={st.tone}>{st.label}</Pill>
                </div>
                {c && <ProgressBar value={c.pct} tone={c.tone} />}
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="flex-1">{c?.label} · ends {formatDate(endOf(a))}</span>
                  {renew && st.label !== 'Active' && <button onClick={() => setRenewing(a)} className="font-medium text-link">Renew</button>}
                </div>
              </li>
            );
          })}
        </ul>
        {/* Tablet & desktop table */}
        <table className="hidden w-full text-sm md:table">
          <thead>
            <tr className="border-b bg-subtle text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5">Asset</th>
              <th className="hidden px-3 py-2.5 lg:table-cell">Holder / location</th>
              <th className="hidden px-3 py-2.5 xl:table-cell">Start</th>
              <th className="px-3 py-2.5">End</th>
              <th className="w-[200px] px-3 py-2.5">Coverage left</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {list.map((a) => {
              const c = coverage(startOf(a), endOf(a));
              const st = stateOf(endOf(a));
              return (
                <tr key={a.id} className="border-b last:border-0 hover:bg-subtle">
                  <td className="px-4 py-2.5">
                    <Link to={`/assets/${a.id}`} className="flex items-center gap-2.5">
                      <AssetThumb category={a.category} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{a.name}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{a.assetTag}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden px-3 py-2.5 text-[13px] lg:table-cell">{a.assignedTo || displayLocation(a.location)}</td>
                  <td className="hidden px-3 py-2.5 text-[13px] text-muted-foreground xl:table-cell">{formatDate(startOf(a))}</td>
                  <td className="px-3 py-2.5 text-[13px]">{formatDate(endOf(a))}</td>
                  <td className="px-3 py-2.5">
                    {c && (
                      <div className="space-y-1">
                        <ProgressBar value={c.pct} tone={c.tone} />
                        <p className={c.tone === 'success' ? 'text-xs text-muted-foreground' : `text-xs ${c.tone === 'warning' ? 'text-warning-strong' : 'text-destructive-strong'}`}>{c.label}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5"><Pill tone={st.tone}>{st.label}</Pill></td>
                  <td className="pr-3 text-right">
                    {renew && <Button size="sm" variant="ghost" onClick={() => setRenewing(a)}>{st.label === 'Active' ? 'Update' : 'Renew'}</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>
    );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Maintenance & AMC"
        description="Repairs, service contracts and warranty coverage in one place"
        actions={
          <>
            <Button variant="secondary" className="hidden md:inline-flex" onClick={() => exportToCSV(tab === 'repairs' ? data.repairs : tab === 'warranty' ? data.warranty : data.amc, `maintenance_${tab}`)}>
              <Download /> Export
            </Button>
            <Button asChild>
              <Link to="/assets?view=assigned">
                <Wrench /> Log repair
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="AMC expiring ≤ 30 days" value={data.amcSoon.length} icon={AlertTriangle} iconTone={data.amcSoon.length ? 'warning' : undefined} caption={data.amcSoon[0] ? `Earliest: ${formatDate(data.amcSoon[0].amcEndDate, 'd MMM')} · ${data.amcSoon[0].name}` : 'None due'} />
        <KpiCard label="In repair" value={data.repairs.length} icon={Wrench} iconTone={data.lateRepairs.length ? 'warning' : undefined} caption={data.lateRepairs.length ? `${data.lateRepairs.length} past vendor ETA` : 'All on schedule'} />
        <KpiCard label="Avg. repair turnaround" value={data.avgTat === null ? '—' : `${data.avgTat.toFixed(1)} days`} icon={History} caption="Sent → returned" />
        <KpiCard label="Warranty ending ≤ 30 days" value={data.warrantySoon.length} icon={ShieldCheck} caption={`${formatMoney(data.repairCost, settings?.currency)} estimated in open repairs`} />
      </div>

      <ViewTabs<Tab>
        value={tab}
        onChange={(t) => setParams(t === 'amc' ? {} : { tab: t }, { replace: true })}
        tabs={[
          { value: 'amc', label: 'AMC contracts', count: data.amc.length },
          { value: 'repairs', label: 'Repairs', count: data.repairs.length },
          { value: 'warranty', label: 'Warranty', count: data.warranty.length },
        ]}
      />

      <div className="overflow-hidden rounded-xl border bg-card">
        {tab !== 'repairs' && (
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Segmented<Window> size="sm" value={windowF} onChange={setWindowF} options={[{ value: 'expiring', label: 'Expiring ≤ 30d' }, { value: 'expired', label: 'Expired' }, { value: 'all', label: 'All' }]} />
          </div>
        )}
        {tab === 'amc' && coverageRows(filterWindow(data.amc, (a) => a.amcEndDate), (a) => a.amcStartDate, (a) => a.amcEndDate, true)}
        {tab === 'warranty' && coverageRows(filterWindow(data.warranty, (a) => a.warrantyEnd), (a) => a.warrantyStart || a.purchaseDate, (a) => a.warrantyEnd, false)}
        {tab === 'repairs' &&
          (data.repairs.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing in repair" description="Send an asset for repair from its page or the row menu in Assets." className="py-12" />
          ) : (
            <ul className="divide-y">
              {data.repairs.map((a) => {
                const eta = daysUntil(a.repairEstReturn);
                const late = eta !== null && eta < 0;
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-subtle md:flex-nowrap">
                    <AssetThumb category={a.category} />
                    <Link to={`/assets/${a.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{a.assetTag}</span> · {a.repairVendor || 'Vendor not set'} · sent {formatDate(data.repairStart.get(a.id))}
                      </p>
                    </Link>
                    <div className="text-right text-[13px]">
                      <p className={late ? 'font-medium text-destructive-strong' : ''}>{a.repairEstReturn ? (late ? `${Math.abs(eta!)} days late` : `Back ${formatDate(a.repairEstReturn, 'd MMM')}`) : 'No ETA'}</p>
                      <p className="text-xs text-muted-foreground">{formatMoney(a.repairCost, settings?.currency)}</p>
                    </div>
                    <Pill tone={late ? 'destructive' : 'warning'}>{late ? 'Overdue' : 'In repair'}</Pill>
                    <Button size="sm" variant="secondary" onClick={() => act('repair', a)}>
                      <CheckCircle2 /> Complete
                    </Button>
                  </li>
                );
              })}
            </ul>
          ))}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl bg-info-soft px-4 py-3 text-[13px] text-info-strong">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        AMC reminder emails go to IT and the asset holder 30, 15 and 7 days before a contract ends (daily check at 08:00 UTC). Renewing updates the end date and restarts the cycle.
      </div>

      {dialogs}
      <BulkAmcUpdateDialog assetIds={renewing ? [renewing.id] : []} open={!!renewing} onOpenChange={(o) => !o && setRenewing(null)} onDone={() => setRenewing(null)} />
    </div>
  );
}

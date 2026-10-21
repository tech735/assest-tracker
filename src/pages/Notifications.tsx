import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ArrowLeftRight, Bell, CheckCircle2, Info, ShieldAlert, Wrench, type LucideIcon } from 'lucide-react';
import { useAlerts, useAssets, useEmployees, useResolveAlert } from '@/hooks/useSupabaseData';
import type { AlertType } from '@/types/alert';
import { Button } from '@/components/ui/button';
import { ViewTabs } from '@/components/app/controls';
import { EmptyState, IconBubble, PageHeader, PageLoader } from '@/components/app/primitives';
import { amcExpiring, daysUntil, formatDate, timeAgo, type Tone } from '@/lib/assetMeta';
import { useToast } from '@/hooks/use-toast';

type Tab = 'action' | 'all' | 'resolved';

interface Item {
  key: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  body: string;
  when?: string;
  actions: { label: string; to?: string; onClick?: () => void; primary?: boolean }[];
}

const ALERT_ICON: Record<AlertType, { icon: LucideIcon; tone: Tone }> = {
  warranty: { icon: ShieldAlert, tone: 'warning' },
  overdue: { icon: AlertCircle, tone: 'destructive' },
  missing: { icon: AlertTriangle, tone: 'destructive' },
  approval: { icon: Info, tone: 'info' },
  other: { icon: Bell, tone: 'quiet' },
};

export default function Notifications() {
  const { toast } = useToast();
  const { data: alerts = [], isLoading } = useAlerts();
  const { data: assets = [] } = useAssets();
  const { data: employees = [] } = useEmployees();
  const resolve = useResolveAlert();
  const [tab, setTab] = useState<Tab>('action');

  const computed: Item[] = useMemo(() => {
    const items: Item[] = [];
    assets.filter(amcExpiring).forEach((a) => {
      const d = daysUntil(a.amcEndDate)!;
      items.push({
        key: `amc-${a.id}`,
        icon: AlertTriangle,
        tone: d <= 7 ? 'destructive' : 'warning',
        title: `AMC ends in ${d} day${d === 1 ? '' : 's'} — ${a.name} (${a.assetTag})`,
        body: `Ends ${formatDate(a.amcEndDate)}${a.assignedTo ? ` · held by ${a.assignedTo}` : ''}`,
        actions: [{ label: 'Renew contract', to: '/maintenance', primary: true }, { label: 'View asset', to: `/assets/${a.id}` }],
      });
    });
    const offboarded = new Map(employees.filter((e) => e.status === 'offboarded').map((e) => [e.id, e]));
    const byLeaver = new Map<string, number>();
    assets.forEach((a) => a.status === 'assigned' && a.assignedToId && offboarded.has(a.assignedToId) && byLeaver.set(a.assignedToId, (byLeaver.get(a.assignedToId) || 0) + 1));
    byLeaver.forEach((n, id) => {
      const e = offboarded.get(id)!;
      items.push({
        key: `overdue-${id}`,
        icon: ArrowLeftRight,
        tone: 'warning',
        title: `Overdue return — ${e.name}`,
        body: `${n} asset${n > 1 ? 's' : ''} still assigned${e.exitDate ? ` · last working day ${formatDate(e.exitDate)}` : ''}`,
        actions: [{ label: 'Open profile', to: `/people/${id}`, primary: true }],
      });
    });
    assets
      .filter((a) => a.status === 'repair' && (daysUntil(a.repairEstReturn) ?? 1) < 0)
      .forEach((a) =>
        items.push({
          key: `repair-${a.id}`,
          icon: Wrench,
          tone: 'warning',
          title: `Repair overdue — ${a.name} (${a.assetTag})`,
          body: `${a.repairVendor || 'Vendor'} promised ${formatDate(a.repairEstReturn)} · ${Math.abs(daysUntil(a.repairEstReturn)!)} days late`,
          actions: [{ label: 'View repairs', to: '/maintenance?tab=repairs', primary: true }],
        }),
      );
    return items;
  }, [assets, employees]);

  const alertItems = (resolved: boolean): Item[] =>
    alerts
      .filter((a) => a.isResolved === resolved)
      .map((a) => ({
        key: a.id,
        ...(ALERT_ICON[a.type] ?? ALERT_ICON.other),
        title: a.title,
        body: a.description,
        when: a.createdAt,
        actions: [
          ...(a.assetId ? [{ label: 'View asset', to: `/assets/${a.assetId}` }] : []),
          ...(!resolved
            ? [{
                label: 'Mark resolved',
                primary: true,
                onClick: async () => {
                  try {
                    await resolve.mutateAsync(a.id);
                    toast({ title: 'Alert resolved' });
                  } catch {
                    toast({ title: 'Couldn’t resolve alert', variant: 'destructive' });
                  }
                },
              }]
            : []),
        ],
      }));

  if (isLoading) return <PageLoader label="Loading notifications" />;

  const open = alertItems(false);
  const shown = tab === 'action' ? [...computed, ...open] : tab === 'all' ? [...open, ...alertItems(true)] : alertItems(true);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Notifications" description="Things that need action stay here until they’re handled" />
      <ViewTabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'action', label: 'Needs action', count: computed.length + open.length },
          { value: 'all', label: 'All alerts', count: alerts.length },
          { value: 'resolved', label: 'Resolved' },
        ]}
      />
      <div className="overflow-hidden rounded-xl border bg-card">
        {shown.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="You’re all caught up" description="New alerts and reminders will show up here." />
        ) : (
          <ul className="divide-y">
            {shown.map((n) => (
              <li key={n.key} className="flex gap-3.5 px-4 py-4 sm:px-5">
                <IconBubble icon={n.icon} tone={n.tone} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm font-semibold">{n.title}</p>
                    {n.when && <time className="shrink-0 text-xs text-faint">{timeAgo(n.when)}</time>}
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{n.body}</p>
                  {n.actions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {n.actions.map((a) =>
                        a.to ? (
                          <Button key={a.label} size="sm" variant={a.primary ? 'secondary' : 'ghost'} asChild>
                            <Link to={a.to}>{a.label}</Link>
                          </Button>
                        ) : (
                          <Button key={a.label} size="sm" variant={a.primary ? 'secondary' : 'ghost'} onClick={a.onClick}>
                            {a.label}
                          </Button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

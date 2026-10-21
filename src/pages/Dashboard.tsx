import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { eachDayOfInterval, eachMonthOfInterval, format, isAfter, parseISO, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarClock,
  ChevronRight,
  Download,
  Layers,
  Package,
  Plus,
  ShieldAlert,
  Users,
  Wrench,
} from 'lucide-react';
import { useAlerts, useAssets, useAssignments, useEmployees, useLocations } from '@/hooks/useSupabaseData';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { KpiCard, Segmented } from '@/components/app/controls';
import { CardLink, EmptyState, IconBubble, PageHeader, PageLoader, PersonAvatar, SectionCard } from '@/components/app/primitives';
import { amcExpiring, daysUntil, displayLocation, timeAgo, titleCase, type Tone } from '@/lib/assetMeta';
import { exportToCSV } from '@/lib/exportUtils';
import type { AssignmentEventType } from '@/types/asset';

type Range = '7D' | '30D' | '90D' | '12M';

const CATEGORY_COLORS = ['#02019B', '#3A38D6', '#7A79E8', '#B9B8F5', '#12B76A', '#CDD2DB', '#F79009', '#7A5AF8'];

const EVENT_VERB: Record<AssignmentEventType, string> = {
  assign: 'checked out',
  return: 'returned',
  repair_start: 'sent for repair',
  repair_end: 'got back from repair',
  lost: 'marked lost',
  found: 'marked found',
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function Dashboard() {
  const { user } = useUser();
  const { data: assets = [], isLoading: l1 } = useAssets();
  const { data: assignments = [], isLoading: l2 } = useAssignments();
  const { data: alerts = [] } = useAlerts();
  const { data: employees = [] } = useEmployees();
  const { data: locations = [] } = useLocations();
  const [range, setRange] = useState<Range>('30D');

  const m = useMemo(() => {
    const total = assets.length;
    const assigned = assets.filter((a) => a.status === 'assigned').length;
    const available = assets.filter((a) => a.status === 'available').length;
    const repair = assets.filter((a) => a.status === 'repair');
    const amc = assets.filter(amcExpiring).sort((a, b) => (a.amcEndDate || '').localeCompare(b.amcEndDate || ''));
    const offboarded = new Set(employees.filter((e) => e.status === 'offboarded').map((e) => e.id));
    const overdue = assets.filter((a) => a.status === 'assigned' && a.assignedToId && offboarded.has(a.assignedToId));
    const lateRepairs = repair.filter((a) => (daysUntil(a.repairEstReturn) ?? 1) < 0);
    const warranty = assets.filter((a) => {
      const d = daysUntil(a.warrantyEnd);
      return d !== null && d >= 0 && d <= 30;
    });
    const openAlerts = alerts.filter((a) => !a.isResolved);

    // Cumulative asset count over the last 8 weeks for the sparkline
    const weeks = Array.from({ length: 8 }, (_, i) => subDays(new Date(), (7 - i) * 7));
    const trend = weeks.map((w) => assets.filter((a) => a.createdAt && !isAfter(parseISO(a.createdAt), w)).length);
    const monthAgo = subDays(new Date(), 30);
    const lastMonthTotal = assets.filter((a) => a.createdAt && !isAfter(parseISO(a.createdAt), monthAgo)).length;
    const growth = lastMonthTotal ? ((total - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return { total, assigned, available, repair, amc, overdue, lateRepairs, warranty, openAlerts, trend, lastMonthTotal, growth };
  }, [assets, employees, alerts]);

  const chart = useMemo(() => {
    const now = new Date();
    const monthly = range === '12M';
    const buckets = monthly
      ? eachMonthOfInterval({ start: subMonths(startOfMonth(now), 11), end: now })
      : eachDayOfInterval({ start: subDays(startOfDay(now), range === '7D' ? 6 : range === '30D' ? 29 : 89), end: now });
    const key = (d: Date) => format(d, monthly ? 'yyyy-MM' : 'yyyy-MM-dd');
    const rows = new Map(buckets.map((b) => [key(b), { label: format(b, monthly ? 'MMM' : 'd MMM'), out: 0, back: 0, repair: 0 }]));
    for (const a of assignments) {
      if (!a.assignedDate) continue;
      const r = rows.get(key(parseISO(a.assignedDate)));
      if (!r) continue;
      if (a.eventType === 'assign') r.out++;
      else if (a.eventType === 'return') r.back++;
      else if (a.eventType === 'repair_start') r.repair++;
    }
    let data = [...rows.values()];
    // Keep ~15 bars on screen for long ranges by grouping days
    if (!monthly && data.length > 31) {
      const size = Math.ceil(data.length / 15);
      data = Array.from({ length: Math.ceil(data.length / size) }, (_, i) => {
        const chunk = data.slice(i * size, i * size + size);
        return { label: chunk[0].label, out: chunk.reduce((s, c) => s + c.out, 0), back: chunk.reduce((s, c) => s + c.back, 0), repair: chunk.reduce((s, c) => s + c.repair, 0) };
      });
    }
    const totals = data.reduce((t, d) => ({ out: t.out + d.out, back: t.back + d.back, repair: t.repair + d.repair }), { out: 0, back: 0, repair: 0 });
    return { data, totals };
  }, [assignments, range]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach((a) => counts.set(titleCase(a.category || 'Other'), (counts.get(titleCase(a.category || 'Other')) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
  }, [assets]);

  const byLocation = useMemo(() => [...locations].sort((a, b) => b.assetsCount - a.assetsCount).slice(0, 5), [locations]);
  const maxLoc = Math.max(1, ...byLocation.map((l) => l.assetsCount));

  if (l1 || l2) return <PageLoader label="Loading dashboard" />;

  const attentionCount = m.repair.length + m.amc.length + m.overdue.length;
  const attention: { icon: typeof Wrench; tone: Tone; title: string; meta: string; to: string; show: boolean }[] = [
    { icon: AlertTriangle, tone: 'warning', title: 'AMC expiring in 30 days', meta: `${m.amc.length} assets${m.amc[0] ? ` · earliest ${format(parseISO(m.amc[0].amcEndDate!), 'd MMM')}` : ''}`, to: '/maintenance', show: m.amc.length > 0 },
    { icon: ArrowLeftRight, tone: 'destructive', title: 'Overdue returns', meta: `${m.overdue.length} assets held by offboarded staff`, to: '/assets?view=overdue', show: m.overdue.length > 0 },
    { icon: Wrench, tone: 'warning', title: 'Repairs past their ETA', meta: `${m.lateRepairs.length} of ${m.repair.length} in repair`, to: '/maintenance?tab=repairs', show: m.lateRepairs.length > 0 },
    { icon: Wrench, tone: 'info', title: 'In repair', meta: `${m.repair.length} assets with vendors`, to: '/assets?view=repair', show: m.repair.length > 0 && m.lateRepairs.length === 0 },
    { icon: ShieldAlert, tone: 'special', title: 'Warranty ending in 30 days', meta: `${m.warranty.length} assets`, to: '/maintenance?tab=warranty', show: m.warranty.length > 0 },
    { icon: CalendarClock, tone: 'quiet', title: 'Open alerts', meta: `${m.openAlerts.length} unresolved`, to: '/notifications', show: m.openAlerts.length > 0 },
  ];
  const shownAttention = attention.filter((a) => a.show);

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title={`${greeting()}, ${(user?.name || 'there').split(' ')[0]}`}
        description={`${format(new Date(), 'EEEE, d MMM yyyy')} · ${attentionCount ? `${attentionCount} items need your attention` : 'everything is on track'}`}
        actions={
          <>
            <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => exportToCSV(assets, 'asset_register')}>
              <Download /> Export
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/assets?view=available&checkout=1">
                <ArrowLeftRight /> Check out asset
              </Link>
            </Button>
          </>
        }
      />

      {/* KPIs — 4-up desktop, 2×2 tablet and phone */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Total assets"
          value={m.total.toLocaleString()}
          icon={Package}
          delta={m.lastMonthTotal ? `${m.growth >= 0 ? '+' : ''}${m.growth.toFixed(1)}%` : undefined}
          trend={m.trend}
          caption={`vs. ${m.lastMonthTotal.toLocaleString()} last month`}
          to="/assets"
        />
        <KpiCard label="Utilization" value={`${m.total ? Math.round((m.assigned / m.total) * 100) : 0}%`} icon={Users} caption={`${m.assigned.toLocaleString()} of ${m.total.toLocaleString()} assigned`} to="/assets?view=assigned" />
        <KpiCard label="In stock" value={m.available.toLocaleString()} icon={Layers} caption="Ready to deploy" to="/assets?view=available" />
        <KpiCard
          label="Needs attention"
          value={attentionCount}
          icon={AlertTriangle}
          iconTone={attentionCount ? 'warning' : undefined}
          caption={`${m.repair.length} repair · ${m.amc.length} AMC · ${m.overdue.length} overdue`}
          to="/maintenance"
        />
      </div>

      {/* Mobile quick actions */}
      <div className="grid grid-cols-3 gap-2.5 md:hidden">
        {[
          { label: 'Check out', icon: ArrowLeftRight, to: '/assets?view=available&checkout=1' },
          { label: 'Add asset', icon: Plus, to: '/assets/new' },
          { label: 'Log repair', icon: Wrench, to: '/maintenance?tab=repairs' },
        ].map((q) => (
          <Link key={q.label} to={q.to} className="flex flex-col items-center gap-1.5 rounded-xl border bg-card py-3 text-xs font-medium active:bg-muted">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-link">
              <q.icon className="h-[18px] w-[18px]" />
            </span>
            {q.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          className="order-2 lg:order-1 lg:col-span-2"
          title="Check-outs & returns"
          action={<Segmented<Range> size="sm" value={range} onChange={setRange} options={(['7D', '30D', '90D', '12M'] as Range[]).map((v) => ({ value: v, label: v }))} />}
        >
          <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-primary" /> Check-outs <b className="font-medium text-foreground">{chart.totals.out}</b></span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#BDBBFA]" /> Returns <b className="font-medium text-foreground">{chart.totals.back}</b></span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-warning" /> Repairs <b className="font-medium text-foreground">{chart.totals.repair}</b></span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart.data} barGap={3} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} tick={{ fontSize: 11, fill: 'hsl(var(--faint-foreground))' }} interval="preserveStartEnd" minTickGap={24} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: 10, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Bar dataKey="out" name="Check-outs" fill="#02019B" radius={[3, 3, 0, 0]} maxBarSize={14} />
                <Bar dataKey="back" name="Returns" fill="#BDBBFA" radius={[3, 3, 0, 0]} maxBarSize={14} />
                <Bar dataKey="repair" name="Repairs" fill="#F79009" radius={[3, 3, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard className="order-1 lg:order-2" title="Needs attention" action={<CardLink to="/notifications">View all</CardLink>} bodyClassName="px-3 pb-3">
          {shownAttention.length === 0 ? (
            <EmptyState icon={Package} title="All clear" description="Nothing needs attention right now." className="py-8" />
          ) : (
            <div className="flex flex-col">
              {shownAttention.map((a) => (
                <Link key={a.title} to={a.to} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-subtle">
                  <IconBubble icon={a.icon} tone={a.tone} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{a.meta}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-faint" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SectionCard title="Recent activity" action={<CardLink to="/assets">View assets</CardLink>}>
          {assignments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-3.5">
              {assignments.slice(0, 5).map((a) => (
                <li key={a.id} className="flex gap-2.5">
                  <PersonAvatar name={a.employeeName || a.handedOverBy || 'IT'} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug">
                      <span className="font-semibold">{a.employeeName || a.handedOverBy || 'IT team'}</span> {EVENT_VERB[a.eventType] ?? a.eventType}{' '}
                      <Link to={`/assets/${a.assetId}`} className="hover:underline">{a.assetName}</Link>
                    </p>
                    <p className="text-xs text-faint">{a.assetTag} · {timeAgo(a.assignedDate)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="By category">
          <div className="flex items-center gap-5">
            <div className="h-[130px] w-[130px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="value" innerRadius={43} outerRadius={64} paddingAngle={2} stroke="none">
                    {categories.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-2">
              {categories.slice(0, 6).map((c) => (
                <li key={c.name} className="flex items-center gap-2 text-[13px]">
                  <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: c.color }} />
                  <Link to={`/assets?category=${encodeURIComponent(c.name.toLowerCase())}`} className="flex-1 truncate text-muted-foreground hover:text-foreground">{c.name}</Link>
                  <span className="font-medium tabular">{c.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="By location" action={<CardLink to="/locations">Locations</CardLink>} className="md:col-span-2 xl:col-span-1">
          <ul className="space-y-3.5">
            {byLocation.map((l) => (
              <li key={l.id}>
                <div className="mb-1.5 flex text-[13px]">
                  <Link to={`/locations?view=${l.id}`} className="flex-1 truncate hover:underline">{displayLocation(l.name)}</Link>
                  <span className="font-medium tabular">{l.assetsCount}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (l.assetsCount / maxLoc) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

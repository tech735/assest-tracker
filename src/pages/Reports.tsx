import { useMemo, useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ArrowLeftRight, Clock, Download, History, KeyRound, MapPin, Package, ShieldCheck, Users, Wrench, type LucideIcon } from 'lucide-react';
import { useAssets, useAssignments, useEmployees, useLocations } from '@/hooks/useSupabaseData';
import type { Asset, Assignment, Employee, Location } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/app/controls';
import { IconBubble, PageHeader, PageLoader } from '@/components/app/primitives';
import { bookValue, daysUntil, displayLocation, formatDate, timeAgo } from '@/lib/assetMeta';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAccess } from '@/hooks/useCollab';

type Category = 'Inventory' | 'Assignments' | 'Maintenance' | 'Financial';
interface Ctx { assets: Asset[]; assignments: Assignment[]; employees: Employee[]; locations: Location[] }
interface Report {
  id: string;
  title: string;
  description: string;
  category: Category;
  icon: LucideIcon;
  build: (c: Ctx) => Record<string, unknown>[];
}

const ageYears = (d?: string) => (d ? differenceInCalendarDays(new Date(), parseISO(d)) / 365 : null);

const REPORTS: Report[] = [
  {
    id: 'register',
    title: 'Asset register',
    description: 'Every asset with status, location, holder, cost and coverage dates',
    category: 'Inventory',
    icon: Package,
    build: ({ assets }) =>
      assets.map((a) => ({
        'Asset Tag': a.assetTag, 'Serial Number': a.serialNumber, Name: a.name, Brand: a.brand, Model: a.model, Category: a.category,
        Status: a.status, Condition: a.condition, Location: displayLocation(a.location), 'Assigned To': a.assignedTo || '',
        'Purchase Date': a.purchaseDate || '', 'Purchase Cost': a.purchaseCost ?? '', Vendor: a.vendor || '',
        'Warranty End': a.warrantyEnd || '', 'AMC End': a.amcEndDate || '',
      })),
  },
  {
    id: 'assignments',
    title: 'Assignment history',
    description: 'Who had what, when — every check-out, return, repair and loss event',
    category: 'Assignments',
    icon: ArrowLeftRight,
    build: ({ assignments }) =>
      assignments.map((a) => ({
        Date: a.assignedDate, Event: a.eventType, 'Asset Tag': a.assetTag, Asset: a.assetName, Employee: a.employeeName || '',
        Condition: a.condition, 'Handed Over By': a.handedOverBy || '', 'Received By': a.receivedBy || '', Notes: a.notes || '',
      })),
  },
  {
    id: 'aging',
    title: 'Asset aging',
    description: 'Age buckets by category; flags devices due for refresh (3+ years)',
    category: 'Inventory',
    icon: History,
    build: ({ assets }) =>
      assets.filter((a) => a.status !== 'retired').map((a) => {
        const y = ageYears(a.purchaseDate);
        return {
          'Asset Tag': a.assetTag, Name: a.name, Category: a.category, 'Purchase Date': a.purchaseDate || '',
          'Age (years)': y === null ? '' : y.toFixed(1), Bucket: y === null ? 'Unknown' : y < 1 ? '< 1 year' : y < 2 ? '1–2 years' : y < 3 ? '2–3 years' : '3+ years (refresh)',
          Holder: a.assignedTo || '',
        };
      }),
  },
  {
    id: 'coverage',
    title: 'Warranty & AMC expiry',
    description: 'Coverage ending in the next 90 days, soonest first',
    category: 'Maintenance',
    icon: ShieldCheck,
    build: ({ assets }) =>
      assets
        .flatMap((a) => [
          { a, type: 'Warranty', end: a.warrantyEnd },
          { a, type: 'AMC', end: a.amcEndDate },
        ])
        .filter((r) => { const d = daysUntil(r.end); return d !== null && d >= 0 && d <= 90; })
        .sort((x, y) => (x.end || '').localeCompare(y.end || ''))
        .map(({ a, type, end }) => ({ Type: type, 'Ends On': end, 'Days Left': daysUntil(end), 'Asset Tag': a.assetTag, Name: a.name, Holder: a.assignedTo || displayLocation(a.location) })),
  },
  {
    id: 'depreciation',
    title: 'Depreciation',
    description: 'Straight-line book value (3-year life) per asset',
    category: 'Financial',
    icon: KeyRound,
    build: ({ assets }) =>
      assets.map((a) => {
        const bv = bookValue(a);
        return { 'Asset Tag': a.assetTag, Name: a.name, Category: a.category, 'Purchase Date': a.purchaseDate || '', Cost: a.purchaseCost ?? '', 'Book Value': bv ? Math.round(bv.value) : '', 'Depreciated %': bv ? bv.depreciatedPct : '' };
      }),
  },
  {
    id: 'leavers',
    title: 'Offboarding returns',
    description: 'Assets still held by people who have been offboarded',
    category: 'Assignments',
    icon: Users,
    build: ({ assets, employees }) => {
      const gone = new Map(employees.filter((e) => e.status === 'offboarded').map((e) => [e.id, e]));
      return assets
        .filter((a) => a.status === 'assigned' && a.assignedToId && gone.has(a.assignedToId))
        .map((a) => ({ Employee: a.assignedTo, 'Exit Date': gone.get(a.assignedToId!)?.exitDate || '', 'Asset Tag': a.assetTag, Asset: a.name, Serial: a.serialNumber }));
    },
  },
  {
    id: 'locations',
    title: 'Location summary',
    description: 'Counts per location and status, with headcount',
    category: 'Inventory',
    icon: MapPin,
    build: ({ assets, locations }) =>
      locations.map((l) => {
        const here = assets.filter((a) => a.locationId === l.id || a.location === l.name);
        const by = (s: string) => here.filter((a) => a.status === s).length;
        return { Location: displayLocation(l.name), Type: l.type, Assets: here.length, Assigned: by('assigned'), 'In Stock': by('available'), 'In Repair': by('repair'), Lost: by('lost'), Retired: by('retired'), People: l.employeesCount };
      }),
  },
  {
    id: 'repairs',
    title: 'Repair cost & turnaround',
    description: 'Each repair with vendor, dates, days in repair and cost',
    category: 'Maintenance',
    icon: Wrench,
    build: ({ assignments, assets }) => {
      const byId = new Map(assets.map((a) => [a.id, a]));
      const rows: Record<string, unknown>[] = [];
      const open = new Map<string, Assignment>();
      [...assignments].sort((a, b) => a.assignedDate.localeCompare(b.assignedDate)).forEach((e) => {
        if (e.eventType === 'repair_start') open.set(e.assetId, e);
        if (e.eventType === 'repair_end' && open.has(e.assetId)) {
          const s = open.get(e.assetId)!;
          open.delete(e.assetId);
          rows.push({ 'Asset Tag': e.assetTag, Asset: e.assetName, Sent: s.assignedDate, Returned: e.assignedDate, 'Days in Repair': differenceInCalendarDays(parseISO(e.assignedDate), parseISO(s.assignedDate)), Notes: [s.notes, e.notes].filter(Boolean).join(' / ') });
        }
      });
      open.forEach((s) => {
        const a = byId.get(s.assetId);
        rows.push({ 'Asset Tag': s.assetTag, Asset: s.assetName, Sent: s.assignedDate, Returned: 'Still in repair', 'Days in Repair': differenceInCalendarDays(new Date(), parseISO(s.assignedDate)), Vendor: a?.repairVendor || '', 'Est. Cost': a?.repairCost ?? '', Notes: s.notes || '' });
      });
      return rows;
    },
  },
  {
    id: 'idle',
    title: 'Utilization & idle stock',
    description: 'In-stock assets and how long they’ve been sitting unused',
    category: 'Financial',
    icon: Clock,
    build: ({ assets, assignments }) => {
      const lastMove = new Map<string, string>();
      assignments.forEach((e) => (!lastMove.get(e.assetId) || e.assignedDate > lastMove.get(e.assetId)!) && lastMove.set(e.assetId, e.assignedDate));
      return assets
        .filter((a) => a.status === 'available')
        .map((a) => {
          const since = lastMove.get(a.id) || a.createdAt;
          return { 'Asset Tag': a.assetTag, Name: a.name, Category: a.category, Location: displayLocation(a.location), 'Idle Since': formatDate(since), 'Idle Days': since ? differenceInCalendarDays(new Date(), parseISO(since)) : '' };
        })
        .sort((x, y) => Number(y['Idle Days']) - Number(x['Idle Days']));
    },
  },
];

const CATS: (Category | 'All')[] = ['All', 'Inventory', 'Assignments', 'Maintenance', 'Financial'];
const LAST_RUN_KEY = 'reportLastRun';

export default function Reports() {
  const { toast } = useToast();
  const { data: assets = [], isLoading } = useAssets();
  const { data: assignments = [] } = useAssignments();
  const { data: employees = [] } = useEmployees();
  const { data: locations = [] } = useLocations();
  const [cat, setCat] = useState<Category | 'All'>('All');
  const { can } = useAccess();
  const [q, setQ] = useState('');
  const [lastRun, setLastRun] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(LAST_RUN_KEY) || '{}');
    } catch {
      return {};
    }
  });
  const ctx = useMemo(() => ({ assets, assignments, employees, locations }), [assets, assignments, employees, locations]);

  if (isLoading) return <PageLoader label="Loading reports" />;

  const run = (r: Report) => {
    const rows = r.build(ctx);
    if (!rows.length) {
      toast({ title: `${r.title}: nothing to export`, description: 'There are no rows for this report right now.' });
      return;
    }
    exportToCSV(rows, r.id);
    const next = { ...lastRun, [r.id]: new Date().toISOString() };
    setLastRun(next);
    localStorage.setItem(LAST_RUN_KEY, JSON.stringify(next));
    toast({ title: `${r.title} downloaded`, description: `${rows.length.toLocaleString()} rows` });
  };

  const allowed = REPORTS.filter((r) => r.category !== 'Financial' || can('costs.view'));
  const shown = allowed.filter((r) => (cat === 'All' || r.category === cat) && (!q || `${r.title} ${r.description}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Run any report as a CSV — open it in Excel or Google Sheets" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="flex gap-1.5 overflow-x-auto scrollbar-hide lg:flex-col">
          {CATS.map((c) => {
            const n = c === 'All' ? allowed.length : allowed.filter((r) => r.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors', cat === c ? 'bg-primary-soft font-medium text-link' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
              >
                <span className="flex-1">{c === 'All' ? 'All reports' : c}</span>
                <span className="text-xs text-faint">{n}</span>
              </button>
            );
          })}
        </nav>
        <div className="space-y-4">
          <SearchField value={q} onChange={setQ} placeholder="Search reports" className="h-9 w-full md:w-[280px]" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((r) => (
              <div key={r.id} className="flex flex-col gap-2.5 rounded-xl border bg-card p-4 transition-[border-color] hover:border-border-strong">
                <div className="flex items-center gap-2">
                  <IconBubble icon={r.icon} tone="info" />
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{r.category}</span>
                </div>
                <p className="text-[15px] font-semibold">{r.title}</p>
                <p className="flex-1 text-[13px] text-muted-foreground">{r.description}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="flex-1 truncate text-xs text-faint">{lastRun[r.id] ? `Last run ${timeAgo(lastRun[r.id])}` : 'Never run'}</span>
                  <Button size="sm" variant="secondary" onClick={() => run(r)}>
                    <Download /> Run
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

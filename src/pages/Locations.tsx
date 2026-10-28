import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Download, Layers, MapPin, MoreHorizontal, Package, Pencil, Plus, Printer, Store, Trash2, Users, type LucideIcon } from 'lucide-react';
import { useAssets, useEmployees, useLocations } from '@/hooks/useSupabaseData';
import type { AssetStatus, Location } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SearchField, Segmented, ViewTabs } from '@/components/app/controls';
import { AssetThumb, EmptyState, IconBubble, PageHeader, PageLoader, PersonAvatar, Pill, StatusBadge, toneClasses } from '@/components/app/primitives';
import { AddLocationDialog } from '@/components/locations/AddLocationDialog';
import { EditLocationDialog } from '@/components/locations/EditLocationDialog';
import { DeleteLocationDialog } from '@/components/locations/DeleteLocationDialog';
import { displayLocation, LOCATION_TYPE_META, STATUS_META, STATUS_ORDER } from '@/lib/assetMeta';
import { exportToCSV } from '@/lib/exportUtils';
import { useAccess } from '@/hooks/useCollab';
import { AssetLink } from '@/components/app/AssetLink';

const TYPE_ICON: Record<Location['type'], LucideIcon> = { office: Building2, warehouse: Layers, outlet: Store, remote: MapPin };

export default function Locations() {
  const [params, setParams] = useSearchParams();
  const { data: locations = [], isLoading } = useLocations();
  const { data: assets = [] } = useAssets();
  const { data: employees = [] } = useEmployees();
  const [q, setQ] = useState('');
  const { can } = useAccess();
  const [layout, setLayout] = useState<'grid' | 'table'>('grid');
  const [adding, setAdding] = useState(params.get('new') === '1');
  const [editing, setEditing] = useState<Location | null>(null);
  const [deleting, setDeleting] = useState<Location | null>(null);
  const viewing = locations.find((l) => l.id === params.get('view')) || null;
  const [tab, setTab] = useState<'assets' | 'people'>('assets');

  useEffect(() => {
    if (params.get('new') === '1') {
      setAdding(true);
      const n = new URLSearchParams(params);
      n.delete('new');
      setParams(n, { replace: true });
    }
  }, [params, setParams]);

  const stats = useMemo(() => {
    const m = new Map<string, { byStatus: Record<string, number>; total: number }>();
    const byName = new Map(locations.map((l) => [l.name, l.id]));
    assets.forEach((a) => {
      const id = a.locationId || byName.get(a.location);
      if (!id) return;
      const s = m.get(id) || { byStatus: {}, total: 0 };
      s.byStatus[a.status] = (s.byStatus[a.status] || 0) + 1;
      s.total++;
      m.set(id, s);
    });
    return m;
  }, [assets, locations]);

  if (isLoading) return <PageLoader label="Loading locations" />;

  const filtered = locations.filter((l) => !q || [l.name, l.address].some((f) => f?.toLowerCase().includes(q.toLowerCase())));
  const open = (l: Location) => {
    setTab('assets');
    setParams({ view: l.id });
  };
  const menu = (l: Location) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${l.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => open(l)}><MapPin /> View details</DropdownMenuItem>
        {can('locations.manage') && <DropdownMenuItem onSelect={() => setEditing(l)}><Pencil /> Edit</DropdownMenuItem>}
        {can('assets.checkout') && <DropdownMenuItem asChild><Link to={`/print-handover/location/${l.id}`}><Printer /> Handover form</Link></DropdownMenuItem>}
        {can('locations.manage') && <DropdownMenuSeparator />}
        {can('locations.manage') && <DropdownMenuItem onSelect={() => setDeleting(l)} className="text-destructive-strong focus:text-destructive-strong [&_svg]:text-destructive-strong"><Trash2 /> Delete</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const mixBar = (id: string) => {
    const s = stats.get(id);
    if (!s?.total) return <div className="h-1.5 rounded-full bg-muted" />;
    return (
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        {STATUS_ORDER.filter((st) => s.byStatus[st]).map((st) => (
          <span key={st} className={toneClasses(STATUS_META[st].tone).dot} style={{ flexGrow: s.byStatus[st], minWidth: 4 }} />
        ))}
      </div>
    );
  };

  const viewAssets = viewing ? assets.filter((a) => a.locationId === viewing.id || a.location === viewing.name) : [];
  const viewPeople = viewing ? employees.filter((e) => (e.locationId === viewing.id || e.location === viewing.name) && e.status !== 'offboarded') : [];
  const vs = viewing ? stats.get(viewing.id) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Locations"
        description={`${locations.length} sites · ${assets.length.toLocaleString()} assets · ${employees.filter((e) => e.status !== 'offboarded').length} people`}
        actions={
          <>
            <Segmented<"grid" | "table"> className="hidden md:inline-flex" value={layout} onChange={setLayout} options={[{ value: 'grid', label: 'Grid' }, { value: 'table', label: 'Table' }]} />
            <Button variant="secondary" className={can('locations.manage') || can('reports.view') ? 'hidden md:inline-flex' : 'hidden'} onClick={() => exportToCSV(locations, 'locations')}>
              <Download /> Export
            </Button>
            {can('locations.manage') && <Button onClick={() => setAdding(true)}>
              <Plus /> <span className="hidden sm:inline">Add location</span>
              <span className="sm:hidden">Add</span>
            </Button>}
          </>
        }
      />
      <SearchField value={q} onChange={setQ} placeholder="Search locations" className="h-9 w-full md:w-[280px]" />

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={MapPin} title="No locations" description="Add an office, warehouse or outlet to start placing assets." action={can('locations.manage') && <Button onClick={() => setAdding(true)}><Plus /> Add location</Button>} />
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => {
            const meta = LOCATION_TYPE_META[l.type] ?? LOCATION_TYPE_META.office;
            const inStock = stats.get(l.id)?.byStatus.available || 0;
            return (
              <div key={l.id} role="button" tabIndex={0} onClick={() => open(l)} onKeyDown={(e) => e.key === 'Enter' && open(l)} className="min-w-0 cursor-pointer space-y-4 rounded-xl border bg-card p-4 transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-card">
                <div className="flex items-center gap-3">
                  <IconBubble icon={TYPE_ICON[l.type] ?? Building2} tone={meta.tone} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{displayLocation(l.name)}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.address || meta.label}</p>
                  </div>
                  {menu(l)}
                </div>
                <div className="grid grid-cols-3">
                  {[['Assets', stats.get(l.id)?.total ?? l.assetsCount], ['People', l.employeesCount], ['In stock', inStock]].map(([k, v]) => (
                    <div key={k as string}>
                      <p className="text-xl font-semibold tabular">{(v as number).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{k}</p>
                    </div>
                  ))}
                </div>
                {mixBar(l.id)}
                <Pill tone={meta.tone} dot={false}>{meta.label}</Pill>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-subtle text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">Location</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5 text-right">Assets</th>
                <th className="px-3 py-2.5 text-right">People</th>
                <th className="hidden w-[220px] px-3 py-2.5 lg:table-cell">Status mix</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} onClick={() => open(l)} className="cursor-pointer border-b last:border-0 hover:bg-subtle">
                  <td className="px-4 py-3">
                    <p className="font-medium">{displayLocation(l.name)}</p>
                    <p className="text-xs text-muted-foreground">{l.address}</p>
                  </td>
                  <td className="px-3 py-3"><Pill tone={(LOCATION_TYPE_META[l.type] ?? LOCATION_TYPE_META.office).tone}>{(LOCATION_TYPE_META[l.type] ?? LOCATION_TYPE_META.office).label}</Pill></td>
                  <td className="px-3 py-3 text-right tabular">{(stats.get(l.id)?.total ?? l.assetsCount).toLocaleString()}</td>
                  <td className="px-3 py-3 text-right tabular">{l.employeesCount}</td>
                  <td className="hidden px-3 py-3 lg:table-cell">{mixBar(l.id)}</td>
                  <td className="pr-2" onClick={(e) => e.stopPropagation()}>{menu(l)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Location detail drawer */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setParams({}, { replace: true })}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
          {viewing && (
            <>
              <div className="space-y-4 px-6 pt-5">
                <div className="flex items-center gap-3.5 pr-10">
                  <IconBubble icon={TYPE_ICON[viewing.type] ?? Building2} tone={(LOCATION_TYPE_META[viewing.type] ?? LOCATION_TYPE_META.office).tone} size="lg" />
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-lg">{displayLocation(viewing.name)}</SheetTitle>
                    <p className="truncate text-xs text-muted-foreground">{viewing.address || (LOCATION_TYPE_META[viewing.type] ?? LOCATION_TYPE_META.office).label}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['available', 'assigned', 'repair', 'lost'] as AssetStatus[]).map((s) => (
                    <div key={s} className="rounded-lg border px-3 py-2">
                      <p className="text-lg font-semibold tabular">{vs?.byStatus[s] || 0}</p>
                      <p className="truncate text-2xs text-muted-foreground">{STATUS_META[s].label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {can('assets.view') && <Button size="sm" variant="secondary" asChild><Link to={`/assets?location=${viewing.id}`}><Package /> All assets here</Link></Button>}
                  {can('assets.checkout') && <Button size="sm" variant="secondary" asChild><Link to={`/print-handover/location/${viewing.id}`}><Printer /> Handover form</Link></Button>}
                  {can('locations.manage') && <Button size="sm" variant="secondary" onClick={() => setEditing(viewing)}><Pencil /> Edit</Button>}
                </div>
                <ViewTabs<'assets' | 'people'> value={tab} onChange={setTab} tabs={[{ value: 'assets', label: 'Assets', count: viewAssets.length }, { value: 'people', label: 'People', count: viewPeople.length }]} />
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {tab === 'assets' ? (
                  viewAssets.length ? (
                    viewAssets.slice(0, 100).map((a) => (
                      <AssetLink key={a.id} id={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-subtle">
                        <AssetThumb category={a.category} asset={a} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{a.name}</span>
                          <span className="block truncate text-xs text-muted-foreground"><span className="font-mono">{a.assetTag}</span>{a.assignedTo ? ` · ${a.assignedTo}` : ''}</span>
                        </span>
                        <StatusBadge status={a.status} />
                      </AssetLink>
                    ))
                  ) : (
                    <EmptyState icon={Package} title="No assets here yet" className="py-10" />
                  )
                ) : viewPeople.length ? (
                  viewPeople.map((p) => (
                    <Link key={p.id} to={`/people/${p.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-subtle">
                      <PersonAvatar name={p.name} src={p.avatarUrl} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{p.department}</span>
                      </span>
                      <span className="text-xs text-faint">{p.assetsCount} assets</span>
                    </Link>
                  ))
                ) : (
                  <EmptyState icon={Users} title="Nobody based here" className="py-10" />
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AddLocationDialog open={adding} onOpenChange={setAdding} showTrigger={false} />
      {editing && <EditLocationDialog location={editing} open onOpenChange={(o) => !o && setEditing(null)} />}
      {deleting && <DeleteLocationDialog location={deleting} open onOpenChange={(o) => !o && setDeleting(null)} />}
    </div>
  );
}

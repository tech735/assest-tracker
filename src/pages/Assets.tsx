import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Columns3,
  Download,
  MapPin,
  MoreHorizontal,
  Package,
  Plus,
  SlidersHorizontal,
  Tag,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { useAssets, useEmployees, useLocations, useSettings } from '@/hooks/useSupabaseData';
import type { Asset, AssetStatus } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { BulkBar, FilterChip, PaginationFooter, SearchField, ViewTabs } from '@/components/app/controls';
import { AssetThumb, EmptyState, PageHeader, PageLoader, PersonAvatar, StatusBadge, toneClasses } from '@/components/app/primitives';
import { AssetQuickView, AssetRowMenu } from '@/components/assets/AssetPanels';
import { useAssetActions } from '@/components/assets/useAssetActions';
import { BulkAssignAssetsDialog } from '@/components/assets/BulkAssignAssetsDialog';
import { BulkChangeStatusDialog } from '@/components/assets/BulkChangeStatusDialog';
import { BulkChangeLocationDialog } from '@/components/assets/BulkChangeLocationDialog';
import { BulkAmcUpdateDialog } from '@/components/assets/BulkAmcUpdateDialog';
import { BulkUpdateCategoryDialog } from '@/components/assets/BulkUpdateCategoryDialog';
import { BulkDeleteAssetsDialog } from '@/components/assets/BulkDeleteAssetsDialog';
import { amcExpiring, coverage, displayLocation, formatDate, STATUS_META, STATUS_ORDER, titleCase } from '@/lib/assetMeta';
import { exportToCSV } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';

type View = 'all' | AssetStatus | 'amc' | 'overdue';
type Sort = 'updated' | 'name' | 'tag' | 'amc';
type Col = 'tag' | 'location' | 'assignee' | 'condition' | 'coverage';
const COL_LABELS: Record<Col, string> = { tag: 'Tag / Serial', location: 'Location', assignee: 'Assigned to', condition: 'Condition', coverage: 'AMC / Warranty' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

export default function Assets() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: assets = [], isLoading } = useAssets();
  const { data: locations = [] } = useLocations();
  const { data: employees = [] } = useEmployees();
  const { data: settings } = useSettings();
  const currency = settings?.currency;
  const { open: act, dialogs } = useAssetActions();

  // --- URL-synced filters (shareable views) ---
  const rawView = params.get('view') || 'all';
  const view = (UUID.test(rawView) ? 'all' : rawView) as View;
  const checkoutMode = params.get('checkout') === '1';
  const q = params.get('q') || '';
  const cats = list(params.get('category'));
  const locs = list(params.get('location'));
  const people = list(params.get('assignee'));
  const conds = list(params.get('condition'));
  const brands = list(params.get('brand'));
  const sort = (params.get('sort') || 'updated') as Sort;
  const setParam = (key: string, value: string | string[] | null) => {
    const next = new URLSearchParams(params);
    const v = Array.isArray(value) ? value.join(',') : value;
    if (!v || v === 'all') next.delete(key);
    else next.set(key, v);
    setParams(next, { replace: true });
  };

  // Legacy deep link /assets?view=<uuid> → full page
  useEffect(() => {
    if (UUID.test(rawView)) navigate(`/assets/${rawView}`, { replace: true });
  }, [rawView, navigate]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickView, setQuickView] = useState<Asset | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bulk, setBulk] = useState<null | 'assign' | 'status' | 'location' | 'amc' | 'category' | 'delete'>(null);
  const [cols, setCols] = useState<Record<Col, boolean>>(() => {
    try {
      return { tag: true, location: true, assignee: true, condition: false, coverage: true, ...JSON.parse(localStorage.getItem('assetColumns') || '{}') };
    } catch {
      return { tag: true, location: true, assignee: true, condition: false, coverage: true };
    }
  });
  const toggleCol = (c: Col) =>
    setCols((prev) => {
      const next = { ...prev, [c]: !prev[c] };
      localStorage.setItem('assetColumns', JSON.stringify(next));
      return next;
    });

  const offboarded = useMemo(() => new Set(employees.filter((e) => e.status === 'offboarded').map((e) => e.id)), [employees]);
  const isOverdue = (a: Asset) => a.status === 'assigned' && !!a.assignedToId && offboarded.has(a.assignedToId);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: assets.length, amc: 0, overdue: 0 };
    STATUS_ORDER.forEach((s) => (c[s] = 0));
    assets.forEach((a) => {
      c[a.status] = (c[a.status] || 0) + 1;
      if (amcExpiring(a)) c.amc++;
      if (isOverdue(a)) c.overdue++;
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, offboarded]);

  const options = useMemo(() => {
    const tally = (vals: (string | undefined)[]) => {
      const m = new Map<string, number>();
      vals.forEach((v) => v && m.set(v, (m.get(v) || 0) + 1));
      return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    };
    const settingCats: string[] = settings?.categories || [];
    const catTally = tally(assets.map((a) => a.category?.toLowerCase()));
    settingCats.forEach((c) => !catTally.some(([k]) => k === c.toLowerCase()) && catTally.push([c.toLowerCase(), 0]));
    return {
      category: catTally.map(([v, n]) => ({ value: v, label: titleCase(v), count: n })),
      location: locations.map((l) => ({ value: l.id, label: displayLocation(l.name), count: l.assetsCount })),
      assignee: tally(assets.map((a) => a.assignedTo)).map(([v, n]) => ({ value: v, label: v, count: n })),
      condition: ['new', 'good', 'fair', 'poor'].map((v) => ({ value: v, label: titleCase(v), count: assets.filter((a) => a.condition === v).length })),
      brand: tally(assets.map((a) => a.brand)).map(([v, n]) => ({ value: v, label: v, count: n })),
    };
  }, [assets, locations, settings]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const locNames = new Map(locations.map((l) => [l.id, l.name]));
    const rows = assets.filter((a) => {
      if (view === 'amc' ? !amcExpiring(a) : view === 'overdue' ? !isOverdue(a) : view !== 'all' && a.status !== view) return false;
      if (needle && ![a.name, a.assetTag, a.serialNumber, a.brand, a.model, a.assignedTo, a.location, a.vendor].some((f) => f?.toLowerCase().includes(needle))) return false;
      if (cats.length && !cats.includes(a.category?.toLowerCase())) return false;
      if (locs.length && !locs.some((id) => a.locationId === id || a.location === locNames.get(id))) return false;
      if (people.length && !people.includes(a.assignedTo || '')) return false;
      if (conds.length && !conds.includes(a.condition)) return false;
      if (brands.length && !brands.includes(a.brand)) return false;
      return true;
    });
    const by: Record<Sort, (a: Asset, b: Asset) => number> = {
      updated: (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''),
      name: (a, b) => a.name.localeCompare(b.name),
      tag: (a, b) => a.assetTag.localeCompare(b.assetTag, undefined, { numeric: true }),
      amc: (a, b) => (a.amcEndDate || '9999').localeCompare(b.amcEndDate || '9999'),
    };
    return rows.sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, locations, view, q, params, offboarded]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [view, q, params]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allOnPage = pageRows.length > 0 && pageRows.every((a) => selected.has(a.id));
  const someOnPage = pageRows.some((a) => selected.has(a.id));
  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  const togglePage = (on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      pageRows.forEach((a) => (on ? n.add(a.id) : n.delete(a.id)));
      return n;
    });
  const activeFilters = cats.length + locs.length + people.length + conds.length + brands.length;
  const clearFilters = () => {
    const next = new URLSearchParams();
    if (params.get('view')) next.set('view', params.get('view')!);
    setParams(next, { replace: true });
  };

  // Row click: drawer on md+, full page on phone. In check-out mode, open the check-out dialog.
  const openRow = (a: Asset) => {
    if (checkoutMode && a.status === 'available') return act('assign', a);
    if (window.matchMedia('(min-width: 768px)').matches) setQuickView(a);
    else navigate(`/assets/${a.id}`);
  };

  if (isLoading) return <PageLoader label="Loading assets" />;

  const ids = [...selected];
  const statusMix = STATUS_ORDER.map((s) => ({ s, n: counts[s] || 0 })).filter((x) => x.n > 0);

  const filterChips = (
    <>
      <FilterChip label="Category" options={options.category} selected={cats} onChange={(v) => setParam('category', v)} />
      <FilterChip label="Location" options={options.location} selected={locs} onChange={(v) => setParam('location', v)} />
      <FilterChip label="Assignee" options={options.assignee} selected={people} onChange={(v) => setParam('assignee', v)} searchable />
      <FilterChip label="Condition" options={options.condition} selected={conds} onChange={(v) => setParam('condition', v)} />
      <FilterChip label="Brand" options={options.brand} selected={brands} onChange={(v) => setParam('brand', v)} searchable />
    </>
  );

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="Assets"
        description={`${assets.length.toLocaleString()} assets across ${locations.length} locations`}
        actions={
          <>
            <Button variant="secondary" asChild className="hidden md:inline-flex">
              <Link to="/assets/import">
                <Upload /> Import
              </Link>
            </Button>
            <Button variant="secondary" className="hidden md:inline-flex" onClick={() => exportToCSV(filtered, 'assets_export')} disabled={!filtered.length}>
              <Download /> Export
            </Button>
            <Button asChild>
              <Link to="/assets/new">
                <Plus /> <span className="hidden sm:inline">Add asset</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </Button>
          </>
        }
      />

      {checkoutMode && (
        <div className="flex items-center gap-3 rounded-xl border border-ring/30 bg-primary-soft px-4 py-3 text-sm text-link">
          <ArrowLeftRight className="h-4 w-4 shrink-0" />
          <span className="flex-1">Pick an available asset to check out — click a row to open the check-out form.</span>
          <button onClick={() => setParam('checkout', null)} className="rounded p-1 hover:bg-primary/10" aria-label="Exit check-out mode">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Saved views */}
      <ViewTabs<View>
        value={view}
        onChange={(v) => setParam('view', v)}
        tabs={[
          { value: 'all', label: 'All assets', count: counts.all.toLocaleString() },
          { value: 'available', label: 'In stock', count: counts.available },
          { value: 'assigned', label: 'Assigned', count: counts.assigned },
          { value: 'repair', label: 'In repair', count: counts.repair },
          { value: 'amc', label: 'AMC expiring', count: counts.amc },
          ...(counts.overdue ? [{ value: 'overdue' as View, label: 'Overdue', count: counts.overdue }] : []),
          { value: 'lost', label: 'Lost', count: counts.lost },
          { value: 'retired', label: 'Retired', count: counts.retired },
        ]}
      />

      {/* Status mix (tablet & desktop) */}
      {assets.length > 0 && (
        <div className="hidden rounded-xl border bg-card px-5 py-3.5 md:block">
          <div className="mb-2.5 flex items-center gap-4">
            <p className="text-[13px] font-medium">Status mix</p>
            <div className="ml-auto flex flex-wrap justify-end gap-x-4 gap-y-1">
              {statusMix.map(({ s, n }) => (
                <button key={s} onClick={() => setParam('view', s)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <span className={cn('h-2 w-2 rounded-full', toneClasses(STATUS_META[s].tone).dot)} />
                  {STATUS_META[s].label} {n.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
            {statusMix.map(({ s, n }) => (
              <span key={s} className={cn('h-full first:rounded-l-full last:rounded-r-full', toneClasses(STATUS_META[s].tone).dot)} style={{ flexGrow: n, minWidth: 6 }} />
            ))}
          </div>
        </div>
      )}

      {/* ---------- Phone toolbar ---------- */}
      <div className="flex items-center gap-2 md:hidden">
        <SearchField value={q} onChange={(v) => setParam('q', v)} placeholder="Name, tag or serial" className="h-10 flex-1" />
        <Button variant="secondary" size="icon" onClick={() => setFiltersOpen(true)} aria-label="Filters" className="relative h-10 w-10">
          <SlidersHorizontal />
          {activeFilters > 0 && <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-primary px-1 text-[10px] font-semibold leading-[18px] text-white">{activeFilters}</span>}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={Package}
            title={assets.length ? 'No assets match these filters' : 'No assets yet'}
            description={assets.length ? 'Try removing a filter or searching for a serial number.' : 'Add your first asset or import a spreadsheet.'}
            action={
              assets.length ? (
                <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
              ) : (
                <Button asChild>
                  <Link to="/assets/new"><Plus /> Add asset</Link>
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          {/* ---------- Phone: card list ---------- */}
          <div className="space-y-2 md:hidden">
            <div className="flex items-center justify-between px-0.5 text-[13px] text-muted-foreground">
              <span>{filtered.length.toLocaleString()} results</span>
              <SortMenu sort={sort} onChange={(v) => setParam('sort', v === 'updated' ? null : v)} />
            </div>
            {filtered.slice(0, page * pageSize).map((a) => (
              <button key={a.id} onClick={() => openRow(a)} className="flex w-full items-center gap-3 rounded-[14px] border bg-card px-3.5 py-3 text-left active:bg-subtle">
                <AssetThumb category={a.category} size="lg" className="h-11 w-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{a.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    <span className="font-mono">{a.assetTag}</span> · {a.assignedTo || displayLocation(a.location)}
                  </span>
                </span>
                <StatusBadge status={a.status} />
              </button>
            ))}
            {filtered.length > page * pageSize && (
              <Button variant="secondary" className="w-full" onClick={() => setPage((p) => p + 1)}>
                Load more
              </Button>
            )}
          </div>

          {/* ---------- Tablet & desktop: table ---------- */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
              <SearchField value={q} onChange={(v) => setParam('q', v)} placeholder="Search name, tag or serial" className="w-[220px] shrink-0 lg:w-[260px]" />
              <div className="hidden items-center gap-2 lg:flex">{filterChips}</div>
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal /> Filters {activeFilters > 0 && `(${activeFilters})`}
              </Button>
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="hidden lg:inline-flex">
                  Clear all
                </Button>
              )}
              <div className="flex-1" />
              <SortMenu sort={sort} onChange={(v) => setParam('sort', v === 'updated' ? null : v)} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden lg:inline-flex">
                    <Columns3 /> Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                  {(Object.keys(COL_LABELS) as Col[]).map((c) => (
                    <DropdownMenuCheckboxItem key={c} checked={cols[c]} onCheckedChange={() => toggleCol(c)} onSelect={(e) => e.preventDefault()} className="pl-8">
                      {COL_LABELS[c]}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-subtle text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="w-10 py-2.5 pl-4">
                      <Checkbox checked={allOnPage ? true : someOnPage ? 'indeterminate' : false} onCheckedChange={(c) => togglePage(c === true)} aria-label="Select all on this page" />
                    </th>
                    <th className="px-3 py-2.5">Asset</th>
                    {cols.tag && <th className="hidden px-3 py-2.5 lg:table-cell">Tag / Serial</th>}
                    <th className="px-3 py-2.5">Status</th>
                    {cols.location && <th className="hidden px-3 py-2.5 lg:table-cell">Location</th>}
                    {cols.assignee && <th className="px-3 py-2.5">Assigned to</th>}
                    {cols.condition && <th className="hidden px-3 py-2.5 lg:table-cell">Condition</th>}
                    {cols.coverage && <th className="hidden px-3 py-2.5 xl:table-cell">AMC / Warranty</th>}
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((a) => {
                    const sel = selected.has(a.id);
                    const cov = coverage(a.amcStartDate || a.warrantyStart, a.amcEndDate || a.warrantyEnd);
                    return (
                      <tr
                        key={a.id}
                        onClick={() => openRow(a)}
                        className={cn('group cursor-pointer border-b transition-colors duration-100 last:border-0', sel ? 'bg-primary-soft' : 'hover:bg-subtle')}
                      >
                        <td className="py-2.5 pl-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={sel} onCheckedChange={(c) => toggle(a.id, c === true)} aria-label={`Select ${a.name}`} />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <AssetThumb category={a.category} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{a.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                <span className="lg:hidden font-mono">{a.assetTag} · </span>
                                {[a.brand, titleCase(a.category)].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                          </div>
                        </td>
                        {cols.tag && (
                          <td className="hidden px-3 py-2.5 lg:table-cell">
                            <p className="font-mono text-xs">{a.assetTag}</p>
                            <p className="font-mono text-xs text-faint">{a.serialNumber}</p>
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          <StatusBadge status={a.status} />
                        </td>
                        {cols.location && <td className="hidden px-3 py-2.5 text-[13px] lg:table-cell">{displayLocation(a.location)}</td>}
                        {cols.assignee && (
                          <td className="px-3 py-2.5">
                            {a.assignedTo ? (
                              <span className="flex items-center gap-2 text-[13px]">
                                <PersonAvatar name={a.assignedTo} size="sm" />
                                <span className="truncate">{a.assignedTo}</span>
                              </span>
                            ) : (
                              <span className="text-[13px] text-faint">{a.status === 'available' ? 'In stock' : '—'}</span>
                            )}
                          </td>
                        )}
                        {cols.condition && <td className="hidden px-3 py-2.5 text-[13px] lg:table-cell">{titleCase(a.condition)}</td>}
                        {cols.coverage && (
                          <td className="hidden px-3 py-2.5 text-[13px] xl:table-cell">
                            {cov ? (
                              <span className={cov.tone === 'success' ? 'text-muted-foreground' : toneClasses(cov.tone).pill.split(' ')[1]}>
                                {formatDate(a.amcEndDate || a.warrantyEnd)}
                              </span>
                            ) : (
                              <span className="text-faint">—</span>
                            )}
                          </td>
                        )}
                        <td className="pr-2" onClick={(e) => e.stopPropagation()}>
                          <AssetRowMenu asset={a} onAction={act} onView={() => setQuickView(a)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t">
              <PaginationFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          </div>
        </>
      )}

      {/* Filters sheet (phone + tablet) */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="px-5 pt-3 lg:hidden">
          <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
          <div className="mb-4 flex items-center">
            <SheetTitle className="flex-1 text-lg">Filters</SheetTitle>
            {activeFilters > 0 && <button onClick={clearFilters} className="mr-10 text-sm font-medium text-link">Reset</button>}
          </div>
          <div className="space-y-5">
            <ChipGroup label="Status" options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label }))} selected={view === 'all' ? [] : [view]} onToggle={(v) => setParam('view', view === v ? null : v)} />
            <ChipGroup label="Category" options={options.category} selected={cats} onToggle={(v) => setParam('category', cats.includes(v) ? cats.filter((x) => x !== v) : [...cats, v])} />
            <ChipGroup label="Location" options={options.location} selected={locs} onToggle={(v) => setParam('location', locs.includes(v) ? locs.filter((x) => x !== v) : [...locs, v])} />
            <ChipGroup label="Condition" options={options.condition} selected={conds} onToggle={(v) => setParam('condition', conds.includes(v) ? conds.filter((x) => x !== v) : [...conds, v])} />
          </div>
          <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
            Show {filtered.length.toLocaleString()} assets
          </Button>
        </SheetContent>
      </Sheet>

      <BulkBar
        count={selected.size}
        totalMatching={filtered.length}
        onSelectAll={() => setSelected(new Set(filtered.map((a) => a.id)))}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: 'Check out', icon: ArrowLeftRight, onClick: () => setBulk('assign') },
          { label: 'Move', icon: MapPin, onClick: () => setBulk('location') },
          { label: 'Change status', icon: Tag, onClick: () => setBulk('status') },
          { label: 'AMC', icon: Wrench, onClick: () => setBulk('amc') },
          { label: 'Export', icon: Download, onClick: () => exportToCSV(assets.filter((a) => selected.has(a.id)), 'assets_selected') },
        ]}
        overflow={
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-lg p-1.5 hover:bg-background/10" aria-label="More bulk actions">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top">
              <DropdownMenuItem onSelect={() => setBulk('category')}>
                <Tag /> Update category
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setBulk('delete')} className="text-destructive-strong focus:text-destructive-strong [&_svg]:text-destructive-strong">
                <Trash2 /> Delete assets
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <AssetQuickView
        asset={quickView ? assets.find((a) => a.id === quickView.id) ?? null : null}
        open={!!quickView}
        onOpenChange={(o) => !o && setQuickView(null)}
        onAction={act}
        currency={currency}
      />
      {dialogs}

      <BulkAssignAssetsDialog assetIds={ids} open={bulk === 'assign'} onOpenChange={(o) => !o && setBulk(null)} onDone={() => setSelected(new Set())} />
      <BulkChangeStatusDialog assetIds={ids} open={bulk === 'status'} onOpenChange={(o) => !o && setBulk(null)} onDone={() => setSelected(new Set())} />
      <BulkChangeLocationDialog assetIds={ids} open={bulk === 'location'} onOpenChange={(o) => !o && setBulk(null)} onDone={() => setSelected(new Set())} />
      <BulkAmcUpdateDialog assetIds={ids} open={bulk === 'amc'} onOpenChange={(o) => !o && setBulk(null)} onDone={() => setSelected(new Set())} />
      <BulkUpdateCategoryDialog assetIds={ids} open={bulk === 'category'} onOpenChange={(o) => !o && setBulk(null)} onDone={() => setSelected(new Set())} />
      <BulkDeleteAssetsDialog assetIds={ids} open={bulk === 'delete'} onOpenChange={(o) => !o && setBulk(null)} onDone={() => setSelected(new Set())} />
    </div>
  );
}

function SortMenu({ sort, onChange }: { sort: Sort; onChange: (s: Sort) => void }) {
  const labels: Record<Sort, string> = { updated: 'Recently updated', name: 'Name A–Z', tag: 'Asset tag', amc: 'AMC ending soonest' };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
          <ArrowUpDown /> <span className="hidden sm:inline">{labels[sort]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sort} onValueChange={(v) => onChange(v as Sort)}>
          {(Object.keys(labels) as Sort[]).map((s) => (
            <DropdownMenuRadioItem key={s} value={s} className="pl-8">
              {labels[s]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChipGroup({ label, options, selected, onToggle }: { label: string; options: { value: string; label: string }[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-faint">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className={cn('rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors', on ? 'border-ring bg-primary-soft text-link' : 'bg-card text-foreground')}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

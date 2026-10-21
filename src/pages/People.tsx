import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isAfter, parseISO } from 'date-fns';
import {
  Building2,
  Download,
  LogOut,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  Printer,
  Tag,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAssets, useEmployees, useLocations } from '@/hooks/useSupabaseData';
import type { Employee } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BulkBar, FilterChip, PaginationFooter, SearchField, ViewTabs } from '@/components/app/controls';
import { EmptyState, PageHeader, PageLoader, PersonAvatar, Pill } from '@/components/app/primitives';
import { AddEmployeeDialog } from '@/components/people/AddEmployeeDialog';
import { EditEmployeeDialog } from '@/components/people/EditEmployeeDialog';
import { OffboardEmployeeDialog } from '@/components/people/OffboardEmployeeDialog';
import { BundleAssignDialog } from '@/components/people/BundleAssignDialog';
import { BulkChangeStatusDialog } from '@/components/people/BulkChangeStatusDialog';
import { BulkChangeDepartmentDialog } from '@/components/people/BulkChangeDepartmentDialog';
import { BulkChangeLocationDialog } from '@/components/people/BulkChangeLocationDialog';
import { BulkOffboardDialog } from '@/components/people/BulkOffboardDialog';
import { BulkDeleteEmployeesDialog } from '@/components/people/BulkDeleteEmployeesDialog';
import { categoryIcon, displayLocation, EMPLOYEE_STATUS_META, formatDate } from '@/lib/assetMeta';
import { exportToCSV } from '@/lib/exportUtils';
import { useAccess } from '@/hooks/useCollab';
import { cn } from '@/lib/utils';

type View = 'current' | 'onboarding' | 'returns' | 'offboarded';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

export function PersonMenu({
  person,
  onEdit,
  onAssign,
  onOffboard,
}: {
  person: Employee;
  onEdit: () => void;
  onAssign: () => void;
  onOffboard: () => void;
}) {
  const navigate = useNavigate();
  const { can } = useAccess();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${person.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => navigate(`/people/${person.id}`)}>
          <Users /> View profile
        </DropdownMenuItem>
        {can('people.manage') && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil /> Edit
          </DropdownMenuItem>
        )}
        {person.status !== 'offboarded' && can('assets.checkout') && (
          <DropdownMenuItem onSelect={onAssign}>
            <Package /> Assign assets
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => navigate(`/print-handover/employee/${person.id}`)}>
          <Printer /> Handover form
        </DropdownMenuItem>
        {person.status !== 'offboarded' && can('people.manage') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onOffboard} className="text-destructive-strong focus:text-destructive-strong [&_svg]:text-destructive-strong">
              <LogOut /> Offboard
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function People() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: employees = [], isLoading } = useEmployees();
  const { data: assets = [] } = useAssets();
  const { data: locations = [] } = useLocations();
  const { can } = useAccess();

  const view = (params.get('tab') || 'current') as View;
  const q = params.get('q') || '';
  const depts = list(params.get('department'));
  const locs = list(params.get('location'));
  const statuses = list(params.get('status'));
  const setParam = (key: string, value: string | string[] | null) => {
    const next = new URLSearchParams(params);
    const v = Array.isArray(value) ? value.join(',') : value;
    if (!v) next.delete(key);
    else next.set(key, v);
    setParams(next, { replace: true });
  };

  const [adding, setAdding] = useState(params.get('new') === '1');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [offboarding, setOffboarding] = useState<Employee | null>(null);
  const [assigning, setAssigning] = useState<Employee | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<null | 'status' | 'department' | 'location' | 'offboard' | 'delete'>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Legacy deep link /people?view=<id>
  useEffect(() => {
    const v = params.get('view');
    if (v && UUID.test(v)) navigate(`/people/${v}`, { replace: true });
  }, [params, navigate]);
  useEffect(() => {
    if (params.get('new') === '1') {
      setAdding(true);
      setParam('new', null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const held = useMemo(() => {
    const m = new Map<string, string[]>();
    assets.forEach((a) => {
      if (a.status === 'assigned' && a.assignedToId) m.set(a.assignedToId, [...(m.get(a.assignedToId) || []), a.category]);
    });
    return m;
  }, [assets]);

  const now = new Date();
  const inView = (e: Employee, v: View) => {
    if (v === 'onboarding') return !!e.joinDate && isAfter(parseISO(e.joinDate), now);
    if (v === 'returns') return e.status === 'offboarded' && (held.get(e.id)?.length || 0) > 0;
    if (v === 'offboarded') return e.status === 'offboarded';
    return e.status !== 'offboarded';
  };
  const counts = useMemo(
    () => ({
      current: employees.filter((e) => inView(e, 'current')).length,
      onboarding: employees.filter((e) => inView(e, 'onboarding')).length,
      returns: employees.filter((e) => inView(e, 'returns')).length,
      offboarded: employees.filter((e) => inView(e, 'offboarded')).length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, held],
  );

  const options = useMemo(() => {
    const tally = (vals: string[]) => {
      const m = new Map<string, number>();
      vals.filter(Boolean).forEach((v) => m.set(v, (m.get(v) || 0) + 1));
      return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([v, n]) => ({ value: v, label: v, count: n }));
    };
    return {
      department: tally(employees.map((e) => e.department)),
      location: locations.map((l) => ({ value: l.id, label: displayLocation(l.name), count: l.employeesCount })),
      status: (['active', 'remote', 'on-leave', 'inactive'] as Employee['status'][]).map((s) => ({ value: s, label: EMPLOYEE_STATUS_META[s].label, count: employees.filter((e) => e.status === s).length })),
    };
  }, [employees, locations]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    const locNames = new Map(locations.map((l) => [l.id, l.name]));
    return employees
      .filter((e) => inView(e, view))
      .filter((e) => !needle || [e.name, e.email, e.department, e.position].some((f) => f?.toLowerCase().includes(needle)))
      .filter((e) => !depts.length || depts.includes(e.department))
      .filter((e) => !locs.length || locs.some((id) => e.locationId === id || e.location === locNames.get(id)))
      .filter((e) => !statuses.length || statuses.includes(e.status))
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, locations, view, params, held]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [params]);

  if (isLoading) return <PageLoader label="Loading people" />;

  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someOn = rows.some((r) => selected.has(r.id));
  const assignedTotal = [...held.values()].reduce((s, v) => s + v.length, 0);
  const toggle = (id: string, on: boolean) => setSelected((s) => { const n = new Set(s); if (on) n.add(id);
      else n.delete(id); return n; });

  const status = (e: Employee) => {
    if (inView(e, 'onboarding')) return <Pill tone="special">Onboarding</Pill>;
    if (e.status === 'offboarded' && (held.get(e.id)?.length || 0) > 0) return <Pill tone="warning">Returns pending</Pill>;
    const meta = EMPLOYEE_STATUS_META[e.status] ?? EMPLOYEE_STATUS_META.active;
    return <Pill tone={meta.tone}>{meta.label}</Pill>;
  };
  const assetChips = (e: Employee) => {
    const cats = held.get(e.id) || [];
    if (!cats.length) return <span className="text-[13px] text-faint">No assets</span>;
    const uniq = [...new Set(cats.map((c) => c?.toLowerCase()))].slice(0, 3);
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-[13px] font-medium tabular">{cats.length}</span>
        {uniq.map((c) => {
          const Icon = categoryIcon(c);
          return (
            <span key={c} className="rounded-md bg-muted p-1 text-muted-foreground" title={c}>
              <Icon className="h-3 w-3" />
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="People"
        description={`${counts.current.toLocaleString()} current employees · ${assignedTotal.toLocaleString()} assets assigned`}
        actions={
          <>
            <Button variant="secondary" className="hidden md:inline-flex" onClick={() => exportToCSV(filtered, 'people_export')}>
              <Download /> Export
            </Button>
            {can('people.manage') && <Button onClick={() => setAdding(true)}>
              <UserPlus /> <span className="hidden sm:inline">Add person</span>
              <span className="sm:hidden">Add</span>
            </Button>}
          </>
        }
      />

      <ViewTabs<View>
        value={view}
        onChange={(v) => setParam('tab', v === 'current' ? null : v)}
        tabs={[
          { value: 'current', label: 'Current', count: counts.current },
          { value: 'onboarding', label: 'Onboarding', count: counts.onboarding },
          { value: 'returns', label: 'Pending returns', count: counts.returns },
          { value: 'offboarded', label: 'Offboarded', count: counts.offboarded },
        ]}
      />

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <SearchField value={q} onChange={(v) => setParam('q', v)} placeholder="Search name, email or team" className="h-9 w-full shrink-0 md:w-[260px]" />
        <div className="hidden items-center gap-2 md:flex">
          <FilterChip label="Department" options={options.department} selected={depts} onChange={(v) => setParam('department', v)} />
          <FilterChip label="Location" options={options.location} selected={locs} onChange={(v) => setParam('location', v)} />
          {view === 'current' && <FilterChip label="Status" options={options.status} selected={statuses} onChange={(v) => setParam('status', v)} />}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={Users} title="No people here" description={q ? 'Try a different search.' : 'Nobody matches this view yet.'} action={<Button onClick={() => setAdding(true)}><UserPlus /> Add person</Button>} />
        </div>
      ) : (
        <>
          {/* Phone cards */}
          <div className="space-y-2 md:hidden">
            {filtered.slice(0, page * pageSize).map((e) => (
              <Link key={e.id} to={`/people/${e.id}`} className="flex items-center gap-3 rounded-[14px] border bg-card px-3.5 py-3 active:bg-subtle">
                <PersonAvatar name={e.name} src={e.avatarUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{e.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{e.department} · {displayLocation(e.location)}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  {status(e)}
                  <span className="text-xs text-faint">{held.get(e.id)?.length || 0} assets</span>
                </span>
              </Link>
            ))}
            {filtered.length > page * pageSize && <Button variant="secondary" className="w-full" onClick={() => setPage((p) => p + 1)}>Load more</Button>}
          </div>

          {/* Tablet & desktop table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-subtle text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="w-10 py-2.5 pl-4">
                      <Checkbox checked={allOn ? true : someOn ? 'indeterminate' : false} onCheckedChange={(c) => setSelected((s) => { const n = new Set(s); rows.forEach((r) => (c === true ? n.add(r.id) : n.delete(r.id))); return n; })} aria-label="Select all on this page" />
                    </th>
                    <th className="px-3 py-2.5">Person</th>
                    <th className="hidden px-3 py-2.5 lg:table-cell">Department</th>
                    <th className="hidden px-3 py-2.5 xl:table-cell">Location</th>
                    <th className="px-3 py-2.5">Assets</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="hidden px-3 py-2.5 lg:table-cell">Joined</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => {
                    const sel = selected.has(e.id);
                    return (
                      <tr key={e.id} onClick={() => navigate(`/people/${e.id}`)} className={cn('cursor-pointer border-b transition-colors duration-100 last:border-0', sel ? 'bg-primary-soft' : 'hover:bg-subtle')}>
                        <td className="py-2.5 pl-4" onClick={(ev) => ev.stopPropagation()}>
                          <Checkbox checked={sel} onCheckedChange={(c) => toggle(e.id, c === true)} aria-label={`Select ${e.name}`} />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <PersonAvatar name={e.name} src={e.avatarUrl} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{e.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{e.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-3 py-2.5 text-[13px] lg:table-cell">{e.department}</td>
                        <td className="hidden px-3 py-2.5 text-[13px] xl:table-cell">{displayLocation(e.location)}</td>
                        <td className="px-3 py-2.5">{assetChips(e)}</td>
                        <td className="px-3 py-2.5">{status(e)}</td>
                        <td className="hidden px-3 py-2.5 text-[13px] text-muted-foreground lg:table-cell">{formatDate(e.joinDate)}</td>
                        <td className="pr-2" onClick={(ev) => ev.stopPropagation()}>
                          <PersonMenu person={e} onEdit={() => setEditing(e)} onAssign={() => setAssigning(e)} onOffboard={() => setOffboarding(e)} />
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

      <BulkBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          ...(can('people.manage')
            ? [
                { label: 'Department', icon: Building2, onClick: () => setBulk('department') },
                { label: 'Location', icon: MapPin, onClick: () => setBulk('location') },
                { label: 'Status', icon: Tag, onClick: () => setBulk('status') },
                { label: 'Offboard', icon: LogOut, onClick: () => setBulk('offboard') },
              ]
            : []),
          { label: 'Export', icon: Download, onClick: () => exportToCSV(employees.filter((e) => selected.has(e.id)), 'people_selected') },
          ...(can('people.manage') ? [{ label: 'Delete', icon: Trash2, onClick: () => setBulk('delete'), destructive: true }] : []),
        ]}
      />

      <AddEmployeeDialog open={adding} onOpenChange={setAdding} showTrigger={false} />
      {editing && <EditEmployeeDialog employee={editing} open onOpenChange={(o) => !o && setEditing(null)} />}
      {offboarding && <OffboardEmployeeDialog employee={offboarding} open onOpenChange={(o) => !o && setOffboarding(null)} />}
      {assigning && <BundleAssignDialog employee={assigning} open onOpenChange={(o) => !o && setAssigning(null)} />}
      <BulkChangeStatusDialog employeeIds={[...selected]} open={bulk === 'status'} onOpenChange={(o) => !o && setBulk(null)} onDone={() => setSelected(new Set())} />
      <BulkChangeDepartmentDialog employeeIds={[...selected]} open={bulk === 'department'} onOpenChange={(o) => !o && setBulk(null)} onDone={() => setSelected(new Set())} />
      <BulkChangeLocationDialog employeeIds={[...selected]} open={bulk === 'location'} onOpenChange={(o) => !o && setBulk(null)} onDone={() => setSelected(new Set())} />
      <BulkOffboardDialog employees={employees.filter((e) => selected.has(e.id))} open={bulk === 'offboard'} onOpenChange={(o) => !o && setBulk(null)} onDone={() => setSelected(new Set())} />
      <BulkDeleteEmployeesDialog employeeIds={[...selected]} open={bulk === 'delete'} onOpenChange={(o) => !o && setBulk(null)} onDone={() => setSelected(new Set())} />
    </div>
  );
}

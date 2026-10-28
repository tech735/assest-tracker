import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  ArrowLeftRight,
  BarChart3,
  ClipboardCheck,
  History,
  LayoutDashboard,
  MapPin,
  Package,
  PackagePlus,
  Receipt,
  Plus,
  ScanLine,
  Search,
  Upload,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
  Briefcase,
} from 'lucide-react';
import { useAccess } from '@/hooks/useCollab';
import { useAssets, useEmployees, useLocations } from '@/hooks/useSupabaseData';
import { categoryIcon, displayLocation } from '@/lib/assetMeta';
import { StatusBadge } from '@/components/app/primitives';
import { cn } from '@/lib/utils';

const RECENTS_KEY = 'recent_searches_ac';

function Item({
  value,
  onSelect,
  icon: Icon,
  title,
  meta,
  right,
  kbd,
}: {
  value: string;
  onSelect: () => void;
  icon: LucideIcon;
  title: string;
  meta?: string;
  right?: React.ReactNode;
  kbd?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="group flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm outline-none data-[selected=true]:bg-primary-soft"
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground group-data-[selected=true]:text-link" />
      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
      {meta && <span className="hidden truncate text-xs text-muted-foreground sm:block">{meta}</span>}
      {right}
      {kbd && <kbd className="rounded border bg-card px-1.5 py-px font-sans text-xs text-muted-foreground">{kbd}</kbd>}
      <span className="hidden text-sm font-medium text-link group-data-[selected=true]:inline">↵</span>
    </Command.Item>
  );
}

const Group = ({ heading, children }: { heading: string; children: React.ReactNode }) => (
  <Command.Group
    heading={heading}
    className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-faint"
  >
    {children}
  </Command.Group>
);

export function CommandPalette({ open, onOpenChange, onScan }: { open: boolean; onOpenChange: (o: boolean) => void; onScan: () => void }) {
  const navigate = useNavigate();
  const { can } = useAccess();
  const [query, setQuery] = React.useState('');
  const { data: assets = [] } = useAssets();
  const { data: people = [] } = useEmployees();
  const { data: locations = [] } = useLocations();
  const [recents, setRecents] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const q = query.trim().toLowerCase();
  const match = (...fields: (string | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(q));
  // Search only covers what the role's pages show.
  const assetHits = q && can('assets.view') ? assets.filter((a) => match(a.name, a.assetTag, a.serialNumber, a.brand, a.model, a.assignedTo)).slice(0, 6) : [];
  const peopleHits = q && can('people.view') ? people.filter((p) => match(p.name, p.email, p.department)).slice(0, 4) : [];
  const locationHits = q && can('locations.view') ? locations.filter((l) => match(l.name, l.address)).slice(0, 3) : [];

  const run = (fn: () => void) => {
    if (q) {
      const next = [query.trim(), ...recents.filter((r) => r !== query.trim())].slice(0, 5);
      setRecents(next);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    }
    onOpenChange(false);
    fn();
  };

  const actions: { icon: LucideIcon; label: string; kbd?: string; run: () => void; ok: boolean }[] = [
    { icon: ArrowLeftRight, label: 'Check out an asset…', run: () => navigate('/assets?view=available&checkout=1'), ok: can('assets.view') && can('assets.checkout') },
    { icon: Plus, label: 'Add asset', kbd: 'N', run: () => navigate('/assets/new'), ok: can('assets.view') && can('assets.edit') },
    { icon: ScanLine, label: 'Scan a label', kbd: 'S', run: onScan, ok: can('assets.view') },
    { icon: PackagePlus, label: 'Receive a delivery…', run: () => navigate('/assets/receive'), ok: can('assets.view') && can('assets.edit') },
    { icon: Upload, label: 'Import assets from CSV', run: () => navigate('/assets/import'), ok: can('assets.view') && can('assets.edit') },
    { icon: UserPlus, label: 'Add person', run: () => navigate('/people?new=1'), ok: can('people.view') && can('people.manage') },
    { icon: ClipboardCheck, label: 'Start an audit', run: () => navigate('/audits'), ok: can('audits.view') && can('audits.run') },
  ].filter((a) => a.ok);
  const pages: { icon: LucideIcon; label: string; to: string; ok: boolean }[] = [
    { icon: LayoutDashboard, label: 'Go to Dashboard', to: '/', ok: can('dashboard.view') },
    { icon: Briefcase, label: 'Go to My assets', to: '/me', ok: true },
    { icon: Package, label: 'Go to Assets', to: '/assets', ok: can('assets.view') },
    { icon: Receipt, label: 'Go to Purchases', to: '/purchases', ok: can('assets.view') },
    { icon: Wrench, label: 'Go to Maintenance & AMC', to: '/maintenance', ok: can('maintenance.view') },
    { icon: Users, label: 'Go to People', to: '/people', ok: can('people.view') },
    { icon: MapPin, label: 'Go to Locations', to: '/locations', ok: can('locations.view') },
    { icon: BarChart3, label: 'Go to Reports', to: '/reports', ok: can('reports.view') },
  ].filter((p) => p.ok);
  const actionHits = q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions;
  // With nothing to act on (e.g. viewers), show the pages they can open instead.
  const pageHits = q ? pages.filter((p) => p.label.toLowerCase().includes(q)) : actions.length ? [] : pages;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="Search and commands"
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden bg-card shadow-elevated duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            // Phone: full-screen search. sm+: centered palette (scale .98 → 1).
            'inset-0 sm:inset-auto sm:left-1/2 sm:top-[12vh] sm:max-h-[70vh] sm:w-[640px] sm:-translate-x-1/2 sm:rounded-2xl sm:border sm:data-[state=open]:zoom-in-[.98]',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <Command shouldFilter={false} loop className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b px-4 py-3.5 sm:px-[18px]">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search assets, serials, people… or type a command"
                className="flex-1 bg-transparent text-base outline-none placeholder:text-faint focus-visible:ring-0 sm:text-lg"
              />
              <button onClick={() => onOpenChange(false)} className="rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
                Esc
              </button>
            </div>
            <Command.List className="min-h-0 flex-1 overflow-y-auto p-2">
              <Command.Empty className="py-10 text-center text-sm text-muted-foreground">No results for “{query}”.</Command.Empty>
              {!q && recents.length > 0 && (
                <Group heading="Recent">
                  {recents.map((r) => (
                    <Item key={r} value={`recent-${r}`} icon={History} title={r} onSelect={() => setQuery(r)} />
                  ))}
                </Group>
              )}
              {assetHits.length > 0 && (
                <Group heading="Assets">
                  {assetHits.map((a) => (
                    <Item
                      key={a.id}
                      value={`asset-${a.id}`}
                      icon={categoryIcon(a.category)}
                      title={a.name}
                      meta={`${a.assetTag} · ${a.assignedTo || displayLocation(a.location)}`}
                      right={<StatusBadge status={a.status} className="hidden md:inline-flex" />}
                      onSelect={() => run(() => navigate(`/assets/${a.id}`))}
                    />
                  ))}
                </Group>
              )}
              {peopleHits.length > 0 && (
                <Group heading="People">
                  {peopleHits.map((p) => (
                    <Item key={p.id} value={`person-${p.id}`} icon={Users} title={p.name} meta={`${p.department} · ${p.assetsCount} assets`} onSelect={() => run(() => navigate(`/people/${p.id}`))} />
                  ))}
                </Group>
              )}
              {locationHits.length > 0 && (
                <Group heading="Locations">
                  {locationHits.map((l) => (
                    <Item key={l.id} value={`loc-${l.id}`} icon={MapPin} title={displayLocation(l.name)} meta={`${l.assetsCount} assets`} onSelect={() => run(() => navigate(`/locations?view=${l.id}`))} />
                  ))}
                </Group>
              )}
              {actionHits.length > 0 && (
                <Group heading="Actions">
                  {actionHits.map((a) => (
                    <Item key={a.label} value={`action-${a.label}`} icon={a.icon} title={a.label} kbd={a.kbd} onSelect={() => run(a.run)} />
                  ))}
                </Group>
              )}
              {pageHits.length > 0 && (
                <Group heading="Navigation">
                  {pageHits.map((p) => (
                    <Item key={p.to} value={`page-${p.to}`} icon={p.icon} title={p.label} onSelect={() => run(() => navigate(p.to))} />
                  ))}
                </Group>
              )}
            </Command.List>
            <div className="hidden items-center gap-5 border-t bg-subtle px-[18px] py-2.5 text-xs text-muted-foreground sm:flex">
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
              <span>Esc Close</span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

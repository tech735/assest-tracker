import * as React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  MoreHorizontal,
  Package,
  PanelLeft,
  Plus,
  ScanLine,
  Search,
  Settings,
  SlidersHorizontal,
  Upload,
  UserPlus,
  Users,
  Wrench,
  BarChart3,
  ArrowLeftRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useAlerts, useAssets } from '@/hooks/useSupabaseData';
import { amcExpiring } from '@/lib/assetMeta';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditProfileDialog, type UserProfile } from './EditProfileDialog';
import { PersonAvatar } from '@/components/app/primitives';
import { CommandPalette } from './CommandPalette';
import { ScanDialog } from './ScanDialog';

/* ------------------------------------------------------------------ */
/* Shell context: lets any page open the palette or scanner            */
/* ------------------------------------------------------------------ */

interface ShellContextValue {
  openPalette: () => void;
  openScanner: () => void;
}
const ShellContext = React.createContext<ShellContextValue>({ openPalette: () => {}, openScanner: () => {} });
export const useShell = () => React.useContext(ShellContext);

/* ------------------------------------------------------------------ */
/* Navigation model                                                     */
/* ------------------------------------------------------------------ */

interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
  countKey?: 'assets' | 'maintenance';
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: 'Overview', items: [{ to: '/', label: 'Dashboard', short: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Inventory',
    items: [
      { to: '/assets', label: 'Assets', short: 'Assets', icon: Package, countKey: 'assets' },
      { to: '/maintenance', label: 'Maintenance', short: 'Maintain', icon: Wrench, countKey: 'maintenance' },
      { to: '/audits', label: 'Audits', short: 'Audits', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Directory',
    items: [
      { to: '/people', label: 'People', short: 'People', icon: Users },
      { to: '/locations', label: 'Locations', short: 'Places', icon: MapPin },
    ],
  },
  { label: 'Insights', items: [{ to: '/reports', label: 'Reports', short: 'Reports', icon: BarChart3 }] },
];
const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SUPPORT: 'Support',
  WAREHOUSE: 'Warehouse',
  INVOICING: 'Finance',
  VIEWER: 'Viewer',
};

const isActive = (pathname: string, to: string) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`));

/* ------------------------------------------------------------------ */
/* Current user (display overrides kept from the previous layout)       */
/* ------------------------------------------------------------------ */

function useCurrentProfile() {
  const { user: authUser } = useUser();
  const [overrides, setOverrides] = React.useState<{ name?: string; avatarUrl?: string }>(() => {
    try {
      return JSON.parse(localStorage.getItem('userProfile') || '{}');
    } catch {
      return {};
    }
  });
  const [authAvatar, setAuthAvatar] = React.useState<string>();
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { avatar_url?: string; picture?: string } | undefined;
      setAuthAvatar(meta?.avatar_url || meta?.picture);
    });
  }, []);
  const profile: UserProfile = {
    name: overrides.name || authUser?.name || 'User',
    email: authUser?.email || '',
    role: ROLE_LABELS[authUser?.role || ''] || authUser?.role || 'User',
    avatarUrl: overrides.avatarUrl || authAvatar,
  };
  const save = (p: UserProfile) => {
    const next = { name: p.name, avatarUrl: p.avatarUrl };
    setOverrides(next);
    localStorage.setItem('userProfile', JSON.stringify(next));
  };
  return { profile, save };
}

function useNavCounts() {
  const { data: assets = [] } = useAssets();
  const { data: alerts = [] } = useAlerts();
  return React.useMemo(
    () => ({
      assets: assets.length,
      maintenance: assets.filter((a) => a.status === 'repair' || amcExpiring(a)).length,
      alerts: alerts.filter((a) => !a.isResolved).length,
    }),
    [assets, alerts],
  );
}

/* ------------------------------------------------------------------ */
/* User menu                                                            */
/* ------------------------------------------------------------------ */

interface MenuProps {
  profile: UserProfile;
  onEditProfile: () => void;
  onShortcuts: () => void;
}

function UserMenu({ compact, profile, onEditProfile, onShortcuts }: MenuProps & { compact?: boolean }) {
  const { logout } = useUser();
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/login');
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center rounded-xl text-left outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/30',
          compact ? 'justify-center p-1' : 'w-full gap-2.5 border px-2 py-2',
        )}
        aria-label="Account menu"
      >
        <PersonAvatar name={profile.name} src={profile.avatarUrl} />
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-foreground">{profile.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{profile.role}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-faint" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side={compact ? 'right' : 'top'} className="w-60">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block text-sm font-semibold text-foreground">{profile.name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{profile.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onEditProfile}>
          <Users /> Edit profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onShortcuts}>
          <HelpCircle /> Keyboard shortcuts
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} className="text-destructive-strong focus:text-destructive-strong [&_svg]:text-destructive-strong">
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop sidebar (≥1200px) — collapsible to an icon column             */
/* ------------------------------------------------------------------ */

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg outline-none">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[15px] font-bold text-primary-foreground">K</span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block text-sm font-semibold text-foreground">Asset Tracker</span>
          <span className="block text-xs text-muted-foreground">KOTU · IT &amp; Tech</span>
        </span>
      )}
    </Link>
  );
}

function SidebarLink({ item, collapsed, count }: { item: NavItem; collapsed: boolean; count?: number }) {
  const { pathname } = useLocation();
  const active = isActive(pathname, item.to);
  const link = (
    <NavLink
      to={item.to}
      className={cn(
        'group flex h-9 items-center rounded-lg text-sm transition-colors duration-[120ms]',
        collapsed ? 'w-10 justify-center' : 'gap-2.5 px-2.5',
        active ? 'bg-primary-soft font-semibold text-link' : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <item.icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-link' : 'text-muted-foreground group-hover:text-foreground')} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && count !== undefined && count > 0 && (
        <span className={cn('rounded-full px-1.5 text-xs leading-5 tabular', active ? 'bg-card text-link' : 'bg-muted text-muted-foreground')}>
          {count.toLocaleString()}
        </span>
      )}
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function Sidebar({ profile, onEditProfile, onShortcuts }: MenuProps) {
  const counts = useNavCounts();
  const [collapsed, setCollapsed] = React.useState<boolean>(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const toggle = () =>
    setCollapsed((c) => {
      localStorage.setItem('sidebarCollapsed', String(!c));
      return !c;
    });

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r bg-card transition-[width] duration-200 ease-standard xl:flex',
        collapsed ? 'w-[72px] items-center px-3' : 'w-[248px] px-4',
      )}
    >
      <div className={cn('flex items-center pb-4 pt-5', collapsed ? 'flex-col gap-3' : 'gap-2 pl-1.5')}>
        <div className="flex-1">
          <Brand compact={collapsed} />
        </div>
        <button onClick={toggle} className="rounded-md p-1 text-faint hover:bg-muted hover:text-foreground" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <PanelLeft className="h-[18px] w-[18px]" />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-hide" aria-label="Main">
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="flex flex-col gap-0.5">
            {collapsed ? (
              <div className="mx-auto my-2 h-px w-6 bg-border first:hidden" />
            ) : (
              <p className="px-2.5 pb-1.5 pt-3.5 text-2xs font-semibold uppercase tracking-wider text-faint">{g.label}</p>
            )}
            {g.items.map((item) => (
              <SidebarLink key={item.to} item={item} collapsed={collapsed} count={item.countKey ? counts[item.countKey] : undefined} />
            ))}
          </div>
        ))}
      </nav>
      <div className={cn('flex flex-col gap-0.5 pb-4 pt-2', collapsed && 'items-center')}>
        <SidebarLink item={{ to: '/settings', label: 'Settings', short: 'Settings', icon: SlidersHorizontal }} collapsed={collapsed} />
        {collapsed ? (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button onClick={onShortcuts} className="flex h-9 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Help & shortcuts">
                <HelpCircle className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Help &amp; shortcuts</TooltipContent>
          </Tooltip>
        ) : (
          <button onClick={onShortcuts} className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <HelpCircle className="h-[18px] w-[18px]" /> Help &amp; shortcuts
          </button>
        )}
        <div className="mt-2">
          <UserMenu compact={collapsed} profile={profile} onEditProfile={onEditProfile} onShortcuts={onShortcuts} />
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Tablet nav rail (768–1199px)                                          */
/* ------------------------------------------------------------------ */

function Rail({ profile, onEditProfile, onShortcuts }: MenuProps) {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[76px] shrink-0 flex-col items-center border-r bg-card pb-4 pt-5 md:flex xl:hidden">
      <Brand compact />
      <nav className="mt-5 flex flex-1 flex-col items-center gap-1 overflow-y-auto scrollbar-hide" aria-label="Main">
        {ALL_NAV.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex w-[64px] flex-col items-center gap-1 rounded-[10px] py-1.5 text-[10px] font-medium transition-colors',
                active ? 'bg-primary-soft text-link' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.short}
            </NavLink>
          );
        })}
      </nav>
      <div className="flex flex-col items-center gap-2">
        <NavLink to="/settings" aria-label="Settings" className={({ isActive: a }) => cn('rounded-lg p-2', a ? 'bg-primary-soft text-link' : 'text-muted-foreground hover:bg-muted')}>
          <SlidersHorizontal className="h-5 w-5" />
        </NavLink>
        <UserMenu compact profile={profile} onEditProfile={onEditProfile} onShortcuts={onShortcuts} />
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Phone bottom tab bar (<768px)                                         */
/* ------------------------------------------------------------------ */

function MobileTabBar({ onScan, onMore, alertCount }: { onScan: () => void; onMore: () => void; alertCount: number }) {
  const { pathname } = useLocation();
  const moreActive = ['/maintenance', '/audits', '/people', '/locations', '/reports', '/settings'].some((p) => pathname.startsWith(p));
  const tab = (to: string, label: string, Icon: LucideIcon, badge?: number) => {
    const active = isActive(pathname, to);
    return (
      <NavLink to={to} className="flex w-16 flex-col items-center gap-0.5 text-[11px] font-medium">
        <span className={cn('relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150', active && 'bg-primary-soft')}>
          <Icon className={cn('h-[22px] w-[22px]', active ? 'text-link' : 'text-faint')} />
          {!!badge && (
            <span className="absolute -right-0.5 -top-1 min-w-[18px] rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-[18px] text-white">{badge > 9 ? '9+' : badge}</span>
          )}
        </span>
        <span className={active ? 'text-link' : 'text-faint'}>{label}</span>
      </NavLink>
    );
  };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-between border-t bg-card/95 px-3 pt-2 backdrop-blur pb-safe md:hidden" aria-label="Main">
      {tab('/', 'Home', LayoutDashboard)}
      {tab('/assets', 'Assets', Package)}
      <button onClick={onScan} className="-mt-5 flex w-16 flex-col items-center" aria-label="Scan a label">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card-hover transition-transform active:scale-95">
          <ScanLine className="h-6 w-6" />
        </span>
      </button>
      {tab('/notifications', 'Alerts', Bell, alertCount)}
      <button onClick={onMore} className="flex w-16 flex-col items-center gap-0.5 text-[11px] font-medium">
        <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', moreActive && 'bg-primary-soft')}>
          <MoreHorizontal className={cn('h-[22px] w-[22px]', moreActive ? 'text-link' : 'text-faint')} />
        </span>
        <span className={moreActive ? 'text-link' : 'text-faint'}>More</span>
      </button>
    </nav>
  );
}

function MoreSheet({ open, onOpenChange, profile, onEditProfile, onShortcuts }: MenuProps & { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { logout } = useUser();
  const navigate = useNavigate();
  const counts = useNavCounts();
  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };
  const groups: { title: string; items: { icon: LucideIcon; label: string; to?: string; onClick?: () => void; meta?: string }[] }[] = [
    { title: 'Directory', items: [{ icon: Users, label: 'People', to: '/people' }, { icon: MapPin, label: 'Locations', to: '/locations' }] },
    {
      title: 'Operations',
      items: [
        { icon: Wrench, label: 'Maintenance & AMC', to: '/maintenance', meta: counts.maintenance ? String(counts.maintenance) : undefined },
        { icon: ClipboardCheck, label: 'Audits', to: '/audits' },
        { icon: BarChart3, label: 'Reports', to: '/reports' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: SlidersHorizontal, label: 'Settings', to: '/settings' },
        { icon: HelpCircle, label: 'Help & shortcuts', onClick: () => { onOpenChange(false); onShortcuts(); } },
        {
          icon: LogOut,
          label: 'Sign out',
          onClick: async () => {
            await supabase.auth.signOut();
            logout();
            navigate('/login');
          },
        },
      ],
    },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background px-4 pt-3">
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
        <SheetTitle className="sr-only">More</SheetTitle>
        <button onClick={() => { onOpenChange(false); onEditProfile(); }} className="mb-4 flex w-full items-center gap-3 rounded-2xl border bg-card p-3.5 text-left">
          <PersonAvatar name={profile.name} src={profile.avatarUrl} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{profile.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{profile.email} · {profile.role}</span>
          </span>
        </button>
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 px-1 text-2xs font-semibold uppercase tracking-wider text-faint">{g.title}</p>
              <div className="divide-y rounded-2xl border bg-card px-3.5">
                {g.items.map((it) => (
                  <button key={it.label} onClick={() => (it.to ? go(it.to) : it.onClick?.())} className="flex w-full items-center gap-3 py-3 text-left">
                    <it.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 text-[15px] font-medium">{it.label}</span>
                    {it.meta && <span className="text-sm text-faint">{it.meta}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Top bar                                                               */
/* ------------------------------------------------------------------ */

function TopBar({ onPalette, onScan, alertCount }: { onPalette: () => void; onScan: () => void; alertCount: number }) {
  const navigate = useNavigate();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-card/95 px-4 backdrop-blur md:h-16 md:gap-3 md:px-6 xl:px-8">
      <div className="md:hidden">
        <Brand compact />
      </div>
      <button
        onClick={onPalette}
        className="hidden h-[38px] w-full max-w-[440px] items-center gap-2 rounded-lg border bg-background px-3 text-left text-[13px] text-faint transition-colors hover:border-border-strong md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 truncate">Search assets, serials, people, locations…</span>
        <kbd className="rounded border bg-card px-1.5 py-px font-sans text-xs text-muted-foreground">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      <div className="flex-1" />
      <button onClick={onPalette} className="rounded-full p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label="Search">
        <Search className="h-5 w-5" />
      </button>
      <Button variant="secondary" size="sm" onClick={onScan} className="hidden md:inline-flex">
        <ScanLine /> Scan
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="hidden md:inline-flex">
            <Plus /> New
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => navigate('/assets/new')}>
            <Package /> Add asset <span className="ml-auto text-xs text-faint">N</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/assets?view=available&checkout=1')}>
            <ArrowLeftRight /> Check out an asset
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/assets/import')}>
            <Upload /> Import from CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/people?new=1')}>
            <UserPlus /> Add person
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/locations?new=1')}>
            <MapPin /> Add location
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Link to="/notifications" className="relative hidden rounded-lg p-2 text-muted-foreground hover:bg-muted md:block" aria-label={`Notifications${alertCount ? `, ${alertCount} unresolved` : ''}`}>
        <Bell className="h-[18px] w-[18px]" />
        {alertCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-card bg-destructive" />}
      </Link>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Shortcuts help                                                        */
/* ------------------------------------------------------------------ */

function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const rows: [string, string][] = [
    ['Ctrl / ⌘ + K', 'Search & command palette'],
    ['N', 'Add asset'],
    ['S', 'Scan a label'],
    ['G then A', 'Go to Assets'],
    ['G then P', 'Go to People'],
    ['G then D', 'Go to Dashboard'],
    ['Esc', 'Close dialog / clear selection'],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="divide-y rounded-xl border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">{v}</span>
              <kbd className="rounded border bg-subtle px-1.5 py-0.5 font-sans text-xs">{k}</kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Need help? Contact IT at tech@kotu.co.in</p>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                                 */
/* ------------------------------------------------------------------ */

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const counts = useNavCounts();
  const { profile, save } = useCurrentProfile();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [scanOpen, setScanOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  // Global shortcuts
  React.useEffect(() => {
    let lastG = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector('[role="dialog"]')) return;
      const k = e.key.toLowerCase();
      if (k === 'g') {
        lastG = Date.now();
        return;
      }
      if (Date.now() - lastG < 800) {
        const map: Record<string, string> = { a: '/assets', p: '/people', d: '/', l: '/locations', m: '/maintenance', r: '/reports' };
        if (map[k]) navigate(map[k]);
        lastG = 0;
        return;
      }
      if (k === 'n') navigate('/assets/new');
      if (k === 's') setScanOpen(true);
      if (k === '?') setShortcutsOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const ctx = React.useMemo(() => ({ openPalette: () => setPaletteOpen(true), openScanner: () => setScanOpen(true) }), []);

  if (location.pathname.startsWith('/print-handover')) return <>{children}</>;

  return (
    <ShellContext.Provider value={ctx}>
      <div className="flex h-[100dvh] overflow-hidden bg-background">
        <Sidebar profile={profile} onEditProfile={() => setProfileOpen(true)} onShortcuts={() => setShortcutsOpen(true)} />
        <Rail profile={profile} onEditProfile={() => setProfileOpen(true)} onShortcuts={() => setShortcutsOpen(true)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onPalette={() => setPaletteOpen(true)} onScan={() => setScanOpen(true)} alertCount={counts.alerts} />
          <main id="main" className="flex-1 overflow-y-auto">
            <div key={location.pathname} className="mx-auto w-full max-w-[1600px] animate-page-in px-4 pb-28 pt-5 md:px-6 md:pb-10 md:pt-6 xl:px-8 xl:pt-7">
              {children}
            </div>
          </main>
        </div>
        <MobileTabBar onScan={() => setScanOpen(true)} onMore={() => setMoreOpen(true)} alertCount={counts.alerts} />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onScan={() => setScanOpen(true)} />
      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} profile={profile} onEditProfile={() => setProfileOpen(true)} onShortcuts={() => setShortcutsOpen(true)} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <EditProfileDialog user={profile} open={profileOpen} onOpenChange={setProfileOpen} onSave={save} />
    </ShellContext.Provider>
  );
}

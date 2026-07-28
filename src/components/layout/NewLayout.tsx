import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, Users, MapPin, BarChart3, Settings, LogOut, User, Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { GlobalSearch } from '@/components/GlobalSearch';
import { AlertsPopover } from './AlertsPopover';
import { UserPopover } from './UserPopover';
import { MessagesPopover } from './MessagePopover';
import { UserProfile } from './EditProfileDialog';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const allNavItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/assets', label: 'Assets', icon: Package },
  { to: '/people', label: 'People', icon: Users },
  { to: '/locations', label: 'Locations', icon: MapPin },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function NewLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleCollapsed = () => {
    setCollapsed((prev: boolean) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(next));
      return next;
    });
  };

  // User state lifted to layout with localStorage persistence
  const [user, setUser] = useState<UserProfile>(() => {
    const savedUser = localStorage.getItem('userProfile');
    return savedUser ? JSON.parse(savedUser) : {
      name: "Admin User",
      email: "admin@assetcompass.com",
      role: "Administrator",
      avatarUrl: undefined
    };
  });

  const handleUpdateProfile = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    localStorage.setItem('userProfile', JSON.stringify(updatedUser)); // Immediate save
  };

  const handleSignOut = async () => {
    // Implement sign out logic here
    navigate('/login');
  };

  if (location.pathname.startsWith('/print-handover')) {
    return <>{children}</>;
  }

  const isDashboard = location.pathname === '/';

  // Note: label/centering only collapse at the `lg` breakpoint via responsive
  // classes, so the mobile drawer always shows full labels regardless of the
  // desktop `collapsed` preference.
  const renderNavLink = (item: NavItem) => {
    const isActive = location.pathname === item.to;
    const Icon = item.icon;

    return (
      <Tooltip key={item.to} delayDuration={300}>
        <TooltipTrigger asChild>
          <Link
            to={item.to}
            onClick={onCloseMobile}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150',
              collapsed && 'lg:justify-center lg:w-11 lg:h-11 lg:mx-auto lg:px-0 lg:py-0 lg:gap-0',
              isActive && 'bg-sidebar-accent text-sidebar-primary font-medium'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
          </Link>
        </TooltipTrigger>
        {collapsed && <TooltipContent side="right" className="hidden lg:block">{item.label}</TooltipContent>}
      </Tooltip>
    );
  };

  const onCloseMobile = () => setSidebarOpen(false);

  return (
    <div className="app-shell">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col transform transition-all duration-200 ease-in-out lg:relative lg:translate-x-0',
        collapsed ? 'w-64 lg:w-16' : 'w-64',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="app-sidebar h-full flex flex-col">
          <div className={cn('flex items-center justify-between h-16 shrink-0 px-5', collapsed && 'lg:justify-center lg:px-0')}>
            <div className="flex items-center gap-3 min-w-0">
              <img src="/logo.png" alt="Asset Tracker Logo" className="w-8 h-8 shrink-0 rounded-md" />
              <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
                <h1 className="font-semibold text-sm text-sidebar-foreground truncate">Asset Tracker</h1>
                <p className="text-[11px] text-sidebar-foreground/50">Manage Assets</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden h-8 w-8 p-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Collapse toggle — desktop only */}
          <div className={cn('hidden lg:flex px-3 pb-2', collapsed ? 'justify-center' : 'justify-end')}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

          <nav className={cn('flex-1 py-2 space-y-1 overflow-y-auto scrollbar-thin px-3', collapsed && 'lg:px-2')}>
            <p className={cn('px-3 pt-1 pb-1 text-[11px] uppercase tracking-[0.15em] text-sidebar-foreground/40', collapsed && 'lg:hidden')}>Menu</p>
            {allNavItems.map(renderNavLink)}
          </nav>

          <div className={cn('shrink-0 border-t border-sidebar-border p-3', collapsed && 'lg:px-2')}>
            <div className={cn('flex items-center gap-3 px-2 py-2 rounded-xl', collapsed && 'lg:justify-center lg:px-0')}>
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden shrink-0">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User className="h-3.5 w-3.5 text-sidebar-foreground" />}
              </div>
              <div className={cn('flex-1 min-w-0', collapsed && 'lg:hidden')}>
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-[11px] text-sidebar-foreground/50 truncate">{user.role}</p>
              </div>
            </div>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150 w-full justify-start cursor-pointer mt-1',
                    collapsed && 'lg:justify-center lg:w-11 lg:h-11 lg:mx-auto lg:px-0 lg:py-0 lg:gap-0'
                  )}
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  <span className={cn(collapsed && 'lg:hidden')}>Sign Out</span>
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right" className="hidden lg:block">Sign out</TooltipContent>}
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Asset Tracker Logo" className="w-8 h-8" />
            <span className="font-semibold text-sm">Asset Tracker</span>
          </div>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>
      </div>

      <main className="flex-1 overflow-auto lg:pt-0 pt-16 min-w-0">
        {isDashboard && (
          <div className="hidden lg:flex items-center justify-between gap-4 px-6 py-3.5 lg:px-8 border-0 bg-background/95 backdrop-blur-sm">
            <div>
              <h1 className="text-xl lg:text-2xl font-medium tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Overview of your asset inventory</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <GlobalSearch />
              <MessagesPopover />
              <AlertsPopover />
              <UserPopover user={user} onUpdateProfile={handleUpdateProfile} />
            </div>
          </div>
        )}
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}

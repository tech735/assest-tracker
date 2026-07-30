import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, Users, MapPin, BarChart3, Settings, LogOut, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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

  const renderNavLink = (item: NavItem) => {
    const isActive = location.pathname === item.to;
    const Icon = item.icon;

    return (
      <Tooltip key={item.to} delayDuration={300}>
        <TooltipTrigger asChild>
          <Link
            to={item.to}
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

  return (
    <div className="app-shell">
      {/* Sidebar — desktop only; mobile uses the floating bottom nav instead */}
      <aside className={cn(
        'hidden lg:relative lg:flex lg:flex-col',
        collapsed ? 'lg:w-16' : 'lg:w-64'
      )}>
        <div className="app-sidebar h-full flex flex-col">
          <div className={cn('flex items-center h-16 shrink-0 px-5', collapsed && 'lg:justify-center lg:px-0')}>
            <div className="flex items-center gap-3 min-w-0">
              <img src="/logo.png" alt="Asset Tracker Logo" className="w-8 h-8 shrink-0 rounded-md" />
              <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
                <h1 className="font-semibold text-sm text-sidebar-foreground truncate">Asset Tracker</h1>
              </div>
            </div>
          </div>

          {/* Collapse toggle */}
          <div className={cn('flex px-3 pb-2', collapsed ? 'justify-center' : 'justify-end')}>
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

      <main className="flex-1 overflow-auto lg:pt-0 min-w-0">
        {isDashboard && (
          <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-3.5 lg:px-8 border-0 bg-background/95 backdrop-blur-sm">
            <div>
              <h1 className="text-xl lg:text-2xl font-medium tracking-tight">Dashboard</h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden lg:flex items-center gap-3">
                <GlobalSearch />
                <MessagesPopover />
                <AlertsPopover />
              </div>
              <UserPopover
                user={user}
                onUpdateProfile={handleUpdateProfile}
                triggerClassName="rounded-full pl-0 border-l-0 lg:rounded-lg lg:pl-3 lg:border-l"
                iconClassName="drop-shadow-md"
              />
            </div>
          </div>
        )}
        <div className="app-content">{children}</div>
      </main>

      {/* Mobile bottom nav — glassmorphic floating bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex items-center justify-between gap-1 rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-lg px-1.5 py-2 dark:border-white/10 dark:bg-black/50">
          {allNavItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

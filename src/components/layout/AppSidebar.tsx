import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Laptop,
  Users,
  MapPin,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';

const navigationGeneral = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Assets', href: '/assets', icon: Laptop },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Locations', href: '/locations', icon: MapPin },
];

const navigationSupport = [
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'app-sidebar flex flex-col transition-all duration-300 ease-in-out h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-sidebar-border',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        <div className={cn('flex items-center', collapsed ? '' : 'gap-3')}>
          <img
            src="/logo.png"
            alt="KOTU Logo"
            className={cn('object-contain transition-all', collapsed ? 'w-8 h-8' : 'w-9 h-9')}
          />
          {!collapsed && (
            <span className="text-base font-medium text-sidebar-foreground">
              Asset Tracker
            </span>
          )}
        </div>

        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        <div className={cn('space-y-2', collapsed && 'space-y-3')}>
          {!collapsed && (
            <div className="px-2 text-[11px] font-medium tracking-wide text-sidebar-muted">
              GENERAL
            </div>
          )}

          <nav className="space-y-1">
            {navigationGeneral.map((item) => {
              const isActive =
                location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'sidebar-nav-item',
                    collapsed && 'justify-center px-2',
                    isActive && 'sidebar-nav-item-active'
                  )}
                >
                  <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-sidebar-primary')} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {!collapsed && (
            <div className="pt-3 px-2 text-[11px] font-medium tracking-wide text-sidebar-muted">
              SUPPORT
            </div>
          )}

          <nav className="space-y-1">
            {navigationSupport.map((item) => {
              const isActive =
                location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'sidebar-nav-item',
                    collapsed && 'justify-center px-2',
                    isActive && 'sidebar-nav-item-active'
                  )}
                >
                  <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-sidebar-primary')} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-2">
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="h-10 w-10 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <>
            <Link
              to="/settings"
              className="sidebar-nav-item"
            >
              <Settings className="w-4 h-4" />
              {!collapsed && <span>Settings</span>}
            </Link>

            <div className="pt-2">
              <div className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-card px-3 py-3 shadow-sm">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-muted text-primary text-sm font-medium">TK</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">Team</p>
                  <p className="text-xs text-sidebar-muted truncate">team@company.com</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

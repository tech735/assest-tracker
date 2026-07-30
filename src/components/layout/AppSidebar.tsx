import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Laptop,
  Users,
  MapPin,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navigationGeneral = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Assets', href: '/assets', icon: Laptop },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Locations', href: '/locations', icon: MapPin },
];

const navigationSupport = [
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'app-sidebar flex flex-col transition-all duration-300 ease-in-out h-screen',
        // Desktop: always visible, sticky
        'lg:relative lg:translate-x-0 lg:w-60 lg:sticky lg:top-0',
        // Mobile: fixed slide-out drawer
        'fixed inset-y-0 left-0 z-50 w-72',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="KOTU Logo"
            className="w-9 h-9 object-contain"
          />
          <span className="text-base font-medium text-sidebar-foreground">
            Asset Tracker
          </span>
        </div>
        {/* Close button - mobile only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="lg:hidden h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        <div className="space-y-2">
          <div className="px-2 text-[11px] font-medium tracking-wide text-sidebar-muted">
            GENERAL
          </div>

          <nav className="space-y-1">
            {navigationGeneral.map((item) => {
              const isActive =
                location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    'sidebar-nav-item',
                    isActive && 'sidebar-nav-item-active'
                  )}
                >
                  <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-sidebar-primary')} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 px-2 text-[11px] font-medium tracking-wide text-sidebar-muted">
            SUPPORT
          </div>

          <nav className="space-y-1">
            {navigationSupport.map((item) => {
              const isActive =
                location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    'sidebar-nav-item',
                    isActive && 'sidebar-nav-item-active'
                  )}
                >
                  <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-sidebar-primary')} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-2">
        <Link
          to="/settings"
          onClick={onClose}
          className="sidebar-nav-item"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
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
      </div>
    </aside>
  );
}

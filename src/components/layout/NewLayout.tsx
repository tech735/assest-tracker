import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, Users, MapPin, BarChart3, Settings, LogOut, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        "fixed inset-y-4 left-4 z-50 w-64 flex flex-col transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="app-sidebar h-full flex flex-col">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Asset Tracker Logo" className="w-10 h-10" />
              <div>
                <h1 className="font-semibold text-sidebar-foreground">Asset Tracker</h1>
                <p className="text-xs text-sidebar-foreground/60">Manage Assets</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <p className="px-3 pt-2 text-[11px] uppercase tracking-[0.2em] text-sidebar-foreground/50">Menu</p>
            {allNavItems.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className={cn('sidebar-nav-item', location.pathname === to && 'sidebar-nav-item-active')}>
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="p-4">
            <p className="px-3 text-[11px] uppercase tracking-[0.2em] text-sidebar-foreground/50">General</p>
            <div className="flex items-center gap-3 px-4 py-3 mt-2 rounded-2xl">
              <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" /> : <User className="h-4 w-4 text-sidebar-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/60">{user.role}</p>
              </div>
            </div>
            <div className={cn('sidebar-nav-item', 'w-full justify-start cursor-pointer mt-2')} onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </div>
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

      <main className="flex-1 overflow-auto lg:pt-0 pt-16">
        <div className="hidden lg:block app-header">
          <div className="flex items-center gap-4 w-full">
            <GlobalSearch />
            <div className="flex items-center gap-3 ml-auto">
              <MessagesPopover /> {/* Corrected component usage */}
              <AlertsPopover />
              <UserPopover user={user} onUpdateProfile={handleUpdateProfile} />
            </div>
          </div>
        </div>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}

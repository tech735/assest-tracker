import { Search, Plus, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlerts } from '@/hooks/useSupabaseData';
import { AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';

interface TopBarProps {
  onAddAsset?: () => void;
  onAssignAsset?: () => void;
  onReturnAsset?: () => void;
  onImportAssets?: () => void;
}

export function TopBar({
  onAddAsset,
  onAssignAsset,
  onReturnAsset,
  onImportAssets
}: TopBarProps) {
  const { data: alerts = [] } = useAlerts();

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warranty': return Clock;
      case 'overdue': return AlertTriangle;
      case 'missing': return AlertTriangle;
      case 'approval': return CheckCircle;
      default: return Info;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-orange-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 bg-background border-b border-border/70">
      {/* Search */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search assets, people, locations..."
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Quick Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onAddAsset}>
              Add New Asset
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAssignAsset}>
              Assign Asset
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReturnAsset}>
              Return Asset
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImportAssets}>
              Import Assets (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {alerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4 border-b border-border">
              <h4 className="font-semibold leading-none">Notifications</h4>
              <p className="text-sm text-muted-foreground mt-1">
                You have {alerts.length} unread alerts
              </p>
            </div>
            <ScrollArea className="h-[300px]">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No new notifications
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {alerts.map((alert) => {
                    const Icon = getAlertIcon(alert.type);
                    return (
                      <div key={alert.id} className="p-4 hover:bg-muted/50 transition-colors flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 ${getAlertColor(alert.severity)}`} />
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">{alert.description}</p>
                          <p className="text-[10px] text-muted-foreground pt-1">
                            {new Date(alert.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-3 border-l border-border/70">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            TK
          </div>
        </div>
      </div>
    </header>
  );
}

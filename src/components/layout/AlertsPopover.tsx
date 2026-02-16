import { Bell, Check, Info, AlertTriangle, AlertCircle, ShieldAlert } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useAlerts, useResolveAlert } from '@/hooks/useSupabaseData';
import { Alert, AlertSeverity, AlertType } from '@/types/alert';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

const getAlertIcon = (type: AlertType) => {
    switch (type) {
        case 'warranty':
            return <ShieldAlert className="h-4 w-4 text-orange-500" />;
        case 'overdue':
            return <AlertCircle className="h-4 w-4 text-red-500" />;
        case 'missing':
            return <AlertTriangle className="h-4 w-4 text-destructive" />;
        case 'approval':
            return <Info className="h-4 w-4 text-blue-500" />;
        default:
            return <Bell className="h-4 w-4 text-gray-500" />;
    }
};

const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
        case 'high':
            return 'bg-red-100 text-red-800 border-red-200';
        case 'medium':
            return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'low':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

export function AlertsPopover() {
    const { data: alerts = [], isLoading } = useAlerts();
    const resolveAlert = useResolveAlert();
    const [open, setOpen] = useState(false);

    // Filter out resolved alerts just in case, though the API does it
    const activeAlerts = alerts.filter(a => !a.isResolved);
    const unreadCount = activeAlerts.length;

    const handleResolve = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await resolveAlert.mutateAsync(id);
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full bg-white shadow-sm text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h4 className="font-semibold">Notifications</h4>
                    {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {unreadCount} New
                        </Badge>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Loading alerts...</div>
                    ) : activeAlerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <Bell className="mb-2 h-8 w-8 opacity-20" />
                            <p className="text-sm">No new notifications</p>
                        </div>
                    ) : (
                        <div className="grid gap-1">
                            {activeAlerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="flex items-start gap-3 border-b p-4 last:border-0 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="mt-1 shrink-0">{getAlertIcon(alert.type)}</div>
                                    <div className="grid gap-1 flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium leading-none">{alert.title}</p>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {alert.description}
                                        </p>
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <Badge variant="outline" className={cn("text-[10px] uppercase h-5", getSeverityColor(alert.severity))}>
                                                {alert.severity} priority
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs hover:bg-green-50 hover:text-green-600"
                                                onClick={(e) => handleResolve(e, alert.id)}
                                            >
                                                <Check className="mr-1 h-3 w-3" />
                                                Mark as read
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

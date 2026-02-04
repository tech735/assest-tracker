import { AlertTriangle, Clock, AlertCircle, CheckCircle2, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/types/asset';
import { cn } from '@/lib/utils';
import { useResolveAlert } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

interface AlertsCardProps {
  alerts: Alert[];
}

const alertIcons = {
  warranty: AlertCircle,
  overdue: Clock,
  missing: AlertTriangle,
  approval: CheckCircle2,
};

const severityStyles = {
  low: 'border-l-muted-foreground',
  medium: 'border-l-warning',
  high: 'border-l-destructive',
};

const severityBadgeVariants: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
};

export function AlertsCard({ alerts }: AlertsCardProps) {
  const { toast } = useToast();
  const resolveAlert = useResolveAlert();

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert.mutateAsync(id);
      toast({
        title: 'Alert Resolved',
        description: 'The notification has been cleared.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resolve alert. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Alerts & Notifications</CardTitle>
          <Badge variant="outline" className="font-normal">
            {alerts.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success" />
            <p>No active alerts</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const Icon = alertIcons[alert.type];
            return (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start justify-between gap-3 p-3 rounded-md bg-muted/40 border-l-4',
                  severityStyles[alert.severity]
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <Badge variant={severityBadgeVariants[alert.severity]} className="text-[10px] px-1.5 py-0">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-success hover:bg-success/10 shrink-0"
                  onClick={() => handleResolve(alert.id)}
                  disabled={resolveAlert.isPending}
                >
                  {resolveAlert.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

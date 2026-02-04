import {
  Package,
  UserCheck,
  PackageCheck,
  Wrench,
  Archive,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'muted';
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary/5',
  success: 'bg-success/5',
  warning: 'bg-warning/5',
  muted: 'bg-muted/50',
};

const iconVariantStyles = {
  default: 'bg-brand-blue/10 text-brand-blue',
  primary: 'bg-brand-blue/10 text-brand-blue',
  success: 'bg-brand-blue/10 text-brand-blue',
  warning: 'bg-brand-blue/10 text-brand-blue',
  muted: 'bg-brand-blue/10 text-brand-blue',
};

export function StatCard({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <Card className={cn('border shadow-card hover:shadow-card-hover transition-shadow', variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value.toLocaleString()}</p>
            {trend && (
              <div className="flex items-center gap-1 text-sm">
                {trend.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <span className={trend.isPositive ? 'text-success' : 'text-destructive'}>
                  {trend.value}%
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-xl', iconVariantStyles[variant])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  stats: {
    totalAssets: number;
    assigned: number;
    available: number;
    inRepair: number;
    retired: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        title="Total Assets"
        value={stats.totalAssets}
        icon={Package}
        variant="primary"
        trend={{ value: 12, isPositive: true }}
      />
      <StatCard
        title="Assigned"
        value={stats.assigned}
        icon={UserCheck}
        variant="default"
      />
      <StatCard
        title="Available"
        value={stats.available}
        icon={PackageCheck}
        variant="success"
      />
      <StatCard
        title="In Repair"
        value={stats.inRepair}
        icon={Wrench}
        variant="warning"
      />
      <StatCard
        title="Retired"
        value={stats.retired}
        icon={Archive}
        variant="muted"
      />
    </div>
  );
}

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
  primary: 'bg-card',
  success: 'bg-card',
  warning: 'bg-card',
  muted: 'bg-card',
};

const iconVariantStyles = {
  default: 'bg-muted text-primary',
  primary: 'bg-muted text-primary',
  success: 'bg-muted text-primary',
  warning: 'bg-muted text-primary',
  muted: 'bg-muted text-primary',
};

export function StatCard({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <Card className={cn('border', variantStyles[variant])}>
      <CardContent className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold tracking-tight">{value.toLocaleString()}</p>
            {trend && (
              <div className="flex items-center gap-1 text-xs">
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
          <div className={cn('p-2.5 rounded-lg', iconVariantStyles[variant])}>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5">
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

import { useMemo } from 'react';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { AlertsCard } from '@/components/dashboard/AlertsCard';
import { RecentAssetsCard } from '@/components/dashboard/RecentAssetsCard';
import { RecentAssignmentsCard } from '@/components/dashboard/RecentAssignmentsCard';
import { CategoryChart } from '@/components/dashboard/CategoryChart';
import { useDashboardStats, useAlerts, useAssets, useAssignments } from '@/hooks/useSupabaseData';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const { data: assets = [], isLoading: assetsLoading } = useAssets();
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments();

  const categoryData = useMemo(() => {
    const stats: Record<string, number> = {};
    assets.forEach(asset => {
      const category = asset.category || 'Other';
      const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
      stats[normalizedCategory] = (stats[normalizedCategory] || 0) + 1;
    });

    const colors = [
      'hsl(162, 63%, 41%)', // Emerald
      'hsl(210, 92%, 55%)', // Blue
      'hsl(38, 92%, 50%)',  // Amber
      'hsl(280, 60%, 55%)', // Purple
      'hsl(0, 0%, 60%)',    // Gray
      'hsl(340, 75%, 55%)', // Pink
      'hsl(14, 80%, 50%)',  // Orange
      'hsl(180, 70%, 40%)', // Teal
    ];

    return Object.entries(stats)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const isLoading = statsLoading || alertsLoading || assetsLoading || assignmentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your asset inventory.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && <DashboardStats stats={stats} />}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <RecentAssetsCard assets={assets.slice(0, 5)} />
          <RecentAssignmentsCard assignments={assignments.slice(0, 5)} />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          <AlertsCard alerts={alerts} />
          <CategoryChart data={categoryData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

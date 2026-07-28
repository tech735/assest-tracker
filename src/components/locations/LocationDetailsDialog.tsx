import { useState } from 'react';
import { MapPin, Building2, Users, Package, TrendingUp, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Location } from '@/types/asset';
import { useAssets, useEmployees } from '@/hooks/useSupabaseData';
import { InfoCard, Field, DetailNavHeader } from '@/components/ui/detail-card';

interface LocationDetailsDialogProps {
  locations: Location[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (index: number) => void;
}

const typeIcons = {
  office: Building2,
  warehouse: Package,
  remote: MapPin,
  outlet: Building2,
};

const typeLabels = {
  office: 'Office',
  warehouse: 'Central Warehouse',
  remote: 'Remote',
  outlet: 'Outlet',
};

const statusVariants: Record<string, 'available' | 'assigned' | 'repair' | 'lost' | 'retired'> = {
  available: 'available',
  assigned: 'assigned',
  repair: 'repair',
  lost: 'lost',
  retired: 'retired',
};

export function LocationDetailsDialog({ locations, currentIndex, open, onOpenChange, onNavigate }: LocationDetailsDialogProps) {
  const location = locations[currentIndex];
  const { data: assets = [] } = useAssets();
  const { data: employees = [] } = useEmployees();
  const [activeTab, setActiveTab] = useState('overview');

  if (!location) return null;

  // Get assets and employees for this location
  const locationAssets = assets.filter(asset => {
    // Filter by location name (text field) instead of locationId
    const assetLocation = asset.location?.toLowerCase().trim();
    const locationName = location.name.toLowerCase().trim();

    return assetLocation === locationName ||
      (locationName === 'warehouse' && assetLocation === 'central warehouse') ||
      (locationName === 'central warehouse' && assetLocation === 'warehouse');
  });
  const locationEmployees = employees.filter(employee => employee.locationId === location.id);

  // Calculate statistics
  const totalAssets = locationAssets.length;
  const assignedAssets = locationAssets.filter(asset => asset.status === 'assigned').length;
  const availableAssets = locationAssets.filter(asset => asset.status === 'available').length;
  const repairAssets = locationAssets.filter(asset => asset.status === 'repair').length;
  const lostAssets = locationAssets.filter(asset => asset.status === 'lost').length;

  const utilizationRate = totalAssets > 0 ? (assignedAssets / totalAssets) * 100 : 0;

  // Asset categories breakdown
  const categoryBreakdown = locationAssets.reduce((acc, asset) => {
    acc[asset.category] = (acc[asset.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Recent assets (last 10)
  const recentAssets = locationAssets
    .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
    .slice(0, 10);

  const Icon = typeIcons[location.type];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <DetailNavHeader index={currentIndex} total={locations.length} onNavigate={onNavigate} />

        {/* Identity row */}
        <div className="px-4 sm:px-6 py-4 flex items-start gap-3 border-b border-border shrink-0">
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <SheetTitle className="text-base font-medium leading-tight truncate">
              {location.name === 'Warehouse' ? 'Central Warehouse' : location.name}
            </SheetTitle>
            <SheetDescription asChild>
              <p className="text-xs text-muted-foreground mt-0.5">{typeLabels[location.type]}</p>
            </SheetDescription>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4 rounded-none border-b border-border bg-transparent h-auto px-4 sm:px-6 shrink-0">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="assets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs">Assets</TabsTrigger>
            <TabsTrigger value="employees" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs">Employees</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-4 sm:p-6 space-y-4">
              <InfoCard title="Location Information" icon={MapPin}>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Type" value={<Badge variant="outline" className="text-xs">{typeLabels[location.type]}</Badge>} />
                  <Field label="Total Assets" value={totalAssets} />
                  <Field label="Total Employees" value={locationEmployees.length} />
                  <Field
                    label="Utilization Rate"
                    value={
                      <div className="flex items-center gap-2">
                        <Progress value={utilizationRate} className="flex-1" />
                        <span className="text-sm font-medium">{utilizationRate.toFixed(1)}%</span>
                      </div>
                    }
                  />
                </div>
                {location.address && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Field label="Address" value={location.address} />
                  </div>
                )}
              </InfoCard>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
                  <p className="text-xl font-semibold">{availableAssets}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Users className="w-6 h-6 text-info mx-auto mb-2" />
                  <p className="text-xl font-semibold">{assignedAssets}</p>
                  <p className="text-xs text-muted-foreground">Assigned</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Wrench className="w-6 h-6 text-warning mx-auto mb-2" />
                  <p className="text-xl font-semibold">{repairAssets}</p>
                  <p className="text-xs text-muted-foreground">In Repair</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-2" />
                  <p className="text-xl font-semibold">{lostAssets}</p>
                  <p className="text-xs text-muted-foreground">Lost</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assets" className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-4 sm:p-6">
              <InfoCard title="Assets at this Location" icon={Package}>
                {locationAssets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No assets at this location</p>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-border divide-y divide-border -mx-1">
                    {locationAssets.map((asset) => (
                      <div key={asset.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{asset.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{asset.assetTag}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs capitalize">{asset.category}</Badge>
                          <Badge variant={statusVariants[asset.status] ?? 'secondary'} className="text-xs capitalize">{asset.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>
            </div>
          </TabsContent>

          <TabsContent value="employees" className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-4 sm:p-6">
              <InfoCard title="Employees at this Location" icon={Users}>
                {locationEmployees.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No employees at this location</p>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-border divide-y divide-border">
                    {locationEmployees.map((employee) => (
                      <div key={employee.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{employee.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium">{employee.department}</p>
                          <p className="text-xs text-muted-foreground">{employee.position}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-4 sm:p-6 space-y-4">
              <InfoCard title="Asset Categories" icon={TrendingUp}>
                {Object.keys(categoryBreakdown).length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">No assets to break down</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(categoryBreakdown).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between gap-3">
                        <span className="text-sm capitalize">{category}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={totalAssets > 0 ? (count / totalAssets) * 100 : 0} className="w-24" />
                          <span className="text-sm font-medium w-6 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>

              <InfoCard title="Recently Added Assets" icon={Package}>
                {recentAssets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">No recent assets</p>
                ) : (
                  <div className="space-y-3">
                    {recentAssets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{asset.name}</p>
                          <p className="text-muted-foreground text-xs font-mono">{asset.assetTag}</p>
                        </div>
                        <p className="text-muted-foreground text-xs shrink-0">
                          Added {new Date(asset.createdAt || '').toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

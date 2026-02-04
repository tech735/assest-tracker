import { useState } from 'react';
import { MapPin, Building2, Users, Package, Clock, TrendingUp, AlertTriangle, CheckCircle, XCircle, Wrench } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Location } from '@/types/asset';
import { useAssets, useEmployees } from '@/hooks/useSupabaseData';

interface LocationDetailsDialogProps {
  location: Location;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const statusColors = {
  available: 'bg-green-100 text-green-800',
  assigned: 'bg-blue-100 text-blue-800',
  repair: 'bg-yellow-100 text-yellow-800',
  lost: 'bg-red-100 text-red-800',
  retired: 'bg-gray-100 text-gray-800',
};

export function LocationDetailsDialog({ location, open, onOpenChange }: LocationDetailsDialogProps) {
  const { data: assets = [] } = useAssets();
  const { data: employees = [] } = useEmployees();
  const [activeTab, setActiveTab] = useState('overview');

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
  const retiredAssets = locationAssets.filter(asset => asset.status === 'retired').length;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-blue/10">
              <Icon className="w-5 h-5 text-brand-blue" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {location.name === 'Warehouse' ? 'Central Warehouse' : location.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {typeLabels[location.type]}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Detailed view of location assets, employees, and utilization metrics
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Location Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Location Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <Badge variant="outline">{typeLabels[location.type]}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                    <p className="text-2xl font-bold">{totalAssets}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold">{locationEmployees.length}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Utilization Rate</p>
                    <div className="flex items-center gap-2">
                      <Progress value={utilizationRate} className="flex-1" />
                      <span className="text-sm font-medium">{utilizationRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                {location.address && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Address</p>
                    <p className="text-sm">{location.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{availableAssets}</p>
                  <p className="text-sm text-muted-foreground">Available</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{assignedAssets}</p>
                  <p className="text-sm text-muted-foreground">Assigned</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Wrench className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{repairAssets}</p>
                  <p className="text-sm text-muted-foreground">In Repair</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{lostAssets}</p>
                  <p className="text-sm text-muted-foreground">Lost</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assets at this Location</CardTitle>
              </CardHeader>
              <CardContent>
                {locationAssets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No assets at this location</p>
                ) : (
                  <div className="space-y-4">
                    {locationAssets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{asset.name}</p>
                            <p className="text-sm text-muted-foreground">{asset.assetTag}</p>
                          </div>
                          <Badge variant="outline">{asset.category}</Badge>
                          <Badge className={statusColors[asset.status]}>
                            {asset.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{asset.assignedTo || 'Unassigned'}</p>
                          <p className="text-xs text-muted-foreground">{asset.brand} {asset.model}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Employees at this Location</CardTitle>
              </CardHeader>
              <CardContent>
                {locationEmployees.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No employees at this location</p>
                ) : (
                  <div className="space-y-4">
                    {locationEmployees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{employee.department}</p>
                          <p className="text-xs text-muted-foreground">{employee.position}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Asset Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(categoryBreakdown).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="capitalize">{category}</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={totalAssets > 0 ? (count / totalAssets) * 100 : 0} 
                          className="w-24" 
                        />
                        <span className="text-sm font-medium w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recently Added Assets</CardTitle>
              </CardHeader>
              <CardContent>
                {recentAssets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No recent assets</p>
                ) : (
                  <div className="space-y-3">
                    {recentAssets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-muted-foreground">{asset.assetTag}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">
                            Added {new Date(asset.createdAt || '').toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

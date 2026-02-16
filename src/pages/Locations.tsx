import { useState, useEffect } from 'react';
import { Search, Plus, MoreHorizontal, MapPin, Building2, Warehouse, Globe, Edit2, Trash2, Eye, Store, Wrench, Printer } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocations, useAssets, useEmployees } from '@/hooks/useSupabaseData';
import { AddLocationDialog } from '@/components/locations/AddLocationDialog';
import { EditLocationDialog } from '@/components/locations/EditLocationDialog';
import { DeleteLocationDialog } from '@/components/locations/DeleteLocationDialog';
import { LocationDetailsDialog } from '@/components/locations/LocationDetailsDialog';
import { Location } from '@/types/asset';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const typeIcons = {
  office: Building2,
  warehouse: Warehouse,
  remote: Globe,
  outlet: Store,
};

const typeLabels = {
  office: 'Office',
  warehouse: 'Central Warehouse',
  remote: 'Remote',
  outlet: 'Outlet',
};

const Locations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFixing, setIsFixing] = useState(false);

  // State for edit/delete/details dialogs
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
  const [searchParams] = useSearchParams();

  const { data: locations = [], isLoading: isLoadingLocations } = useLocations();
  const { data: assets = [], isLoading: isLoadingAssets } = useAssets();
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();

  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && locations.length > 0) {
      const location = locations.find(l => l.id === viewId);
      if (location) {
        setViewingLocation(location);
      }
    }
  }, [searchParams, locations]);
  const { toast } = useToast();

  const isLoading = isLoadingLocations || isLoadingAssets || isLoadingEmployees;

  // Function to fix existing assets
  const fixLocationData = async () => {
    setIsFixing(true);
    try {
      console.log('Starting location ID fix...');

      // Create a mapping from location name to location ID
      const locationMap = new Map();
      locations.forEach(location => {
        locationMap.set(location.name, location.id);
        // Handle both "Warehouse" and "Central Warehouse" mappings
        if (location.name === 'Warehouse') {
          locationMap.set('Central Warehouse', location.id);
        }
      });

      console.log('Location mapping:', Object.fromEntries(locationMap));

      // Get all assets that need fixing
      const { data: allAssets, error: fetchError } = await supabase
        .from('assets')
        .select('*');

      if (fetchError) throw fetchError;

      console.log(`Found ${allAssets.length} total assets`);

      // Find assets that need fixing
      const assetsToFix = allAssets.filter(asset => {
        return !asset.location_id ||
          asset.location_id === '' ||
          !locations.find(loc => loc.id === asset.location_id);
      });

      console.log(`Found ${assetsToFix.length} assets that need fixing`);

      if (assetsToFix.length === 0) {
        toast({
          title: "No Fix Needed",
          description: "All assets already have correct location assignments.",
        });
        return;
      }

      // Fix each asset
      let fixedCount = 0;
      for (const asset of assetsToFix) {
        const correctLocationId = locationMap.get(asset.location);

        if (correctLocationId) {
          console.log(`Fixing asset ${asset.name} (${asset.asset_tag}):`);
          console.log(`  Current location: ${asset.location}`);
          console.log(`  Current location_id: ${asset.location_id}`);
          console.log(`  New location_id: ${correctLocationId}`);

          const { error: updateError } = await supabase
            .from('assets')
            .update({ location_id: correctLocationId })
            .eq('id', asset.id);

          if (updateError) {
            console.error(`Failed to update asset ${asset.asset_tag}:`, updateError);
          } else {
            console.log(`✅ Fixed asset ${asset.asset_tag}`);
            fixedCount++;
          }
        } else {
          console.warn(`⚠️ No location found for asset ${asset.name} with location "${asset.location}"`);
        }
      }

      toast({
        title: "Location Data Fixed",
        description: `Successfully fixed ${fixedCount} out of ${assetsToFix.length} assets.`,
      });

      // Refresh the data to show updated counts
      window.location.reload();

    } catch (error) {
      console.error('Error fixing location IDs:', error);
      toast({
        title: "Error",
        description: "Failed to fix location data. Please check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  // Debug logging
  console.log('All assets:', assets);
  console.log('All locations:', locations);

  const filteredLocations = locations.filter((location) => {
    // Filter assets by location name (text field) instead of locationId
    const locationAssets = assets.filter(a => {
      // Handle both "Warehouse" and "Central Warehouse" mapping
      const assetLocation = a.location?.toLowerCase().trim();
      const locationName = location.name.toLowerCase().trim();

      return assetLocation === locationName ||
        (locationName === 'warehouse' && assetLocation === 'central warehouse') ||
        (locationName === 'central warehouse' && assetLocation === 'warehouse');
    });

    console.log(`Location ${location.name} has ${locationAssets.length} assets:`, locationAssets);

    return location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (location.address?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">
            Manage offices, warehouses, and remote locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={fixLocationData}
            disabled={isFixing || locations.length === 0}
          >
            <Wrench className="w-4 h-4" />
            {isFixing ? 'Fixing...' : 'Fix Location Data'}
          </Button>
          <AddLocationDialog />
        </div>
      </div>

      {/* Search */}
      <Card className="p-4 border shadow-card">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search locations..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
          <span>Showing {filteredLocations.length} of {locations.length} locations</span>
        </div>
      </Card>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No locations found matching your search
          </div>
        ) : (
          filteredLocations.map((location) => {
            const Icon = typeIcons[location.type];

            // Count assets by location name (text field) instead of locationId
            const locationAssets = assets.filter(a => {
              const assetLocation = a.location?.toLowerCase().trim();
              const locationName = location.name.toLowerCase().trim();

              return assetLocation === locationName ||
                (locationName === 'warehouse' && assetLocation === 'central warehouse') ||
                (locationName === 'central warehouse' && assetLocation === 'warehouse');
            });

            return (
              <Card key={location.id} className="border shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-blue/10">
                        <Icon className="w-5 h-5 text-brand-blue" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {location.name === 'Warehouse' ? 'Central Warehouse' : location.name}
                        </h3>
                        <Badge variant="outline" className="font-normal text-xs mt-1">
                          {typeLabels[location.type]}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => setViewingLocation(location)}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => setEditingLocation(location)}
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                          Edit location
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => window.open(`/print-handover/location/${location.id}`, '_blank')}
                        >
                          <Printer className="w-4 h-4 text-muted-foreground" />
                          Print Handover Form
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          onClick={() => setDeletingLocation(location)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete location
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {location.address && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {location.address}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-center flex-1">
                      <p className="text-2xl font-bold">
                        {locationAssets.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Assets</p>
                    </div>
                    <div className="w-px h-8 bg-border"></div>
                    <div className="text-center flex-1">
                      <p className="text-2xl font-bold">
                        {employees.filter(e => e.locationId === location.id).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Employees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialogs */}
      {editingLocation && (
        <EditLocationDialog
          location={editingLocation}
          open={!!editingLocation}
          onOpenChange={(open) => !open && setEditingLocation(null)}
        />
      )}
      {deletingLocation && (
        <DeleteLocationDialog
          location={deletingLocation}
          open={!!deletingLocation}
          onOpenChange={(open) => !open && setDeletingLocation(null)}
        />
      )}
      {viewingLocation && (
        <LocationDetailsDialog
          location={viewingLocation}
          open={!!viewingLocation}
          onOpenChange={(open) => !open && setViewingLocation(null)}
        />
      )}
    </div>
  );
};

export default Locations;

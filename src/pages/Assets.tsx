import { useState } from 'react';
import { Search, Filter, Download, Plus, MoreHorizontal, Eye, Edit, Trash2, Edit2, History, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAssets, useLocations, useSettings } from '@/hooks/useSupabaseData';
import { AssetAdditionDialog } from '@/components/assets/AssetAdditionDialog';
import { AddAssetDialog } from '@/components/assets/AddAssetDialog';
import { EditAssetDialog } from '@/components/assets/EditAssetDialog';
import { DeleteAssetDialog } from '@/components/assets/DeleteAssetDialog';
import { AssignAssetDialog } from '@/components/assets/AssignAssetDialog';
import { AssetDetailsDialog } from '@/components/assets/AssetDetailsDialog';
import { Asset, AssetStatus, AssetCategory } from '@/types/asset';
import { exportToCSV } from '@/lib/exportUtils';
import {
  Laptop,
  Smartphone,
  Monitor,
  Tablet,
  Headphones,
  Package,
  UserPlus,
} from 'lucide-react';

const categoryIcons: Record<string, React.ElementType> = {
  laptop: Laptop,
  desktop: Monitor,
  phone: Smartphone,
  tablet: Tablet,
  monitor: Monitor,
  accessory: Headphones,
  other: Package,
};

const statusVariants: Record<AssetStatus, 'available' | 'assigned' | 'repair' | 'lost' | 'retired'> = {
  available: 'available',
  assigned: 'assigned',
  repair: 'repair',
  lost: 'lost',
  retired: 'retired',
};

const statusLabels: Record<AssetStatus, string> = {
  available: 'Available',
  assigned: 'Assigned',
  repair: 'In Repair',
  lost: 'Lost',
  retired: 'Retired',
};



const Assets = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');

  // State for edit/delete/assign dialogs
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [assigningAsset, setAssigningAsset] = useState<Asset | null>(null);
  const [viewingAsset, setViewingAsset] = useState<{ asset: Asset; tab: 'details' | 'history' } | null>(null);
  const [cloningAsset, setCloningAsset] = useState<Asset | null>(null);

  const { data: assets = [], isLoading: assetsLoading } = useAssets();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();

  // Derive unique categories from actual asset data and settings
  const { data: settings } = useSettings();
  const settingsCategories = settings?.categories || [];
  const assetCategories = Array.from(new Set(assets.map(a => a.category).filter(Boolean)));

  const categories = Array.from(new Set([
    ...settingsCategories,
    ...assetCategories
  ].map(cat => cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase())))
    .sort();

  const vendors = Array.from(new Set(assets.map(a => a.vendor).filter(Boolean))).sort();
  const brands = Array.from(new Set(assets.map(a => a.brand).filter(Boolean))).sort();
  const assignees = Array.from(new Set(assets.map(a => a.assignedTo).filter(Boolean))).sort();

  const isLoading = assetsLoading || locationsLoading;

  const filteredAssets = assets.filter((asset) => {
    const searchFields = [
      asset.name,
      asset.assetTag,
      asset.serialNumber,
      asset.category,
      asset.brand,
      asset.model,
      asset.location,
      asset.vendor,
      asset.notes,
      asset.status,
      asset.condition,
      asset.assignedTo,
    ];

    const matchesSearch = searchQuery === '' || searchFields.some(field =>
      field?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || asset.category.toLowerCase() === categoryFilter.toLowerCase();
    const selectedLocation = locations.find(l => l.id === locationFilter);
    const matchesLocation = locationFilter === 'all' ||
      asset.locationId === locationFilter ||
      (selectedLocation && (
        asset.location === selectedLocation.name ||
        (selectedLocation.name === 'Warehouse' && asset.location === 'Central Warehouse') ||
        (selectedLocation.name === 'Central Warehouse' && asset.location === 'Warehouse')
      ));
    const matchesVendor = vendorFilter === 'all' || asset.vendor === vendorFilter;
    const matchesBrand = brandFilter === 'all' || asset.brand === brandFilter;
    const matchesCondition = conditionFilter === 'all' || asset.condition === conditionFilter;
    const matchesAssignedTo = assignedToFilter === 'all' || asset.assignedTo === assignedToFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesLocation && matchesVendor && matchesBrand && matchesCondition && matchesAssignedTo;
  });

  const handleCloneAsset = (asset: Asset) => {
    // Create a clone of the asset with modified fields for adding as new asset
    const clonedAsset = {
      name: `${asset.name} (Copy)`, // Add copy suffix
      brand: asset.brand,
      model: asset.model,
      serialNumber: '', // Clear serial number for new asset
      category: asset.category,
      status: 'available' as AssetStatus, // Reset to available
      condition: asset.condition as 'new' | 'good' | 'fair' | 'poor',
      location: asset.location,
      locationId: asset.locationId,
      assignedTo: undefined, // Clear assignment
      assignedToId: undefined, // Clear assignment ID
      purchaseDate: asset.purchaseDate, // Keep original purchase date
      purchaseCost: asset.purchaseCost || 0,
      vendor: asset.vendor || 'Unknown',
      warrantyStart: asset.warrantyStart,
      warrantyEnd: asset.warrantyEnd,
      notes: asset.notes ? `Cloned from: ${asset.name}\n${asset.notes}` : `Cloned from: ${asset.name}`,
    };
    
    setCloningAsset(clonedAsset as Asset);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">
            Manage and track all organizational assets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => exportToCSV(filteredAssets, 'assets_export')}
            disabled={filteredAssets.length === 0}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <AssetAdditionDialog />
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, tag, serial, or assignee..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="repair">In Repair</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat: string) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name === 'Warehouse' ? 'Central Warehouse' : location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative dashed">
                <Filter className="w-4 h-4" />
                {(vendorFilter !== 'all' || brandFilter !== 'all' || conditionFilter !== 'all' || assignedToFilter !== 'all') && (
                  <div className="w-2 h-2 rounded-full bg-primary absolute -top-1 -right-1" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium leading-none">Additional Filters</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setVendorFilter('all');
                      setBrandFilter('all');
                      setConditionFilter('all');
                      setAssignedToFilter('all');
                    }}
                  >
                    Reset
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                      {assignees.map((assignee: string) => (
                        <SelectItem key={assignee} value={assignee}>
                          {assignee}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Select value={vendorFilter} onValueChange={setVendorFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors.map((vendor: string) => (
                        <SelectItem key={vendor} value={vendor}>
                          {vendor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {brands.map((brand: string) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={conditionFilter} onValueChange={setConditionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Conditions</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </Card>

      {/* Assets Table */}
      <Card className="border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[250px]">Asset</TableHead>
              <TableHead>Tag / Serial</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No assets found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => {
                const Icon = categoryIcons[asset.category.toLowerCase()] || Package;
                return (
                  <TableRow key={asset.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-blue/10">
                          <Icon className="w-4 h-4 text-brand-blue" />
                        </div>
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {asset.brand} · {asset.category.charAt(0).toUpperCase() + asset.category.slice(1)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-mono text-sm">{asset.assetTag}</p>
                        <p className="text-xs text-muted-foreground font-mono">{asset.serialNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[asset.status]}>
                        {statusLabels[asset.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.location === 'Warehouse' ? 'Central Warehouse' : asset.location}
                    </TableCell>
                    <TableCell>
                      {asset.assignedTo ? (
                        <span>{asset.assignedTo}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-muted-foreground">{asset.condition}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => setViewingAsset({ asset, tab: 'details' })}
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => setEditingAsset(asset)}
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                            Edit asset
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleCloneAsset(asset)}
                          >
                            <Copy className="w-4 h-4 text-muted-foreground" />
                            Clone asset
                          </DropdownMenuItem>
                          {asset.status === 'available' && (
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => setAssigningAsset(asset)}
                            >
                              <UserPlus className="w-4 h-4 text-muted-foreground" />
                              Assign asset
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => setViewingAsset({ asset, tab: 'history' })}
                          >
                            <History className="w-4 h-4 text-muted-foreground" />
                            View history
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => setDeletingAsset(asset)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete asset
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card >

      {/* Footer Stats */}
      < div className="flex items-center justify-between text-sm text-muted-foreground" >
        <span>Showing {filteredAssets.length} of {assets.length} assets</span>
      </div >

      {/* Dialogs */}
      {
        editingAsset && (
          <EditAssetDialog
            asset={editingAsset}
            open={!!editingAsset}
            onOpenChange={(open) => !open && setEditingAsset(null)}
          />
        )
      }
      {
        deletingAsset && (
          <DeleteAssetDialog
            asset={deletingAsset}
            open={!!deletingAsset}
            onOpenChange={(open) => !open && setDeletingAsset(null)}
          />
        )
      }
      {
        assigningAsset && (
          <AssignAssetDialog
            asset={assigningAsset}
            open={!!assigningAsset}
            onOpenChange={(open) => !open && setAssigningAsset(null)}
          />
        )
      }
      {
        viewingAsset && (
          <AssetDetailsDialog
            asset={viewingAsset.asset}
            open={!!viewingAsset}
            onOpenChange={(open) => !open && setViewingAsset(null)}
            defaultTab={viewingAsset.tab}
          />
        )
      }
      {
        cloningAsset && (
          <AddAssetDialog
            asset={cloningAsset}
            open={!!cloningAsset}
            onOpenChange={(open) => !open && setCloningAsset(null)}
            showTrigger={false}
          />
        )
      }
    </div >
  );
};

export default Assets;

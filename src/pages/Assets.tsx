import { useState, useEffect } from 'react';
import { Search, Filter, Download, Plus, MoreHorizontal, Eye, Edit, Trash2, Edit2, History, Copy, ChevronRight, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { ReturnAssetDialog } from '@/components/assets/ReturnAssetDialog';
import { RepairAssetDialog } from '@/components/assets/RepairAssetDialog';
import { LostAssetDialog } from '@/components/assets/LostAssetDialog';
import { Asset, AssetStatus, AssetCategory } from '@/types/asset';
import { exportToCSV } from '@/lib/exportUtils';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
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

const conditionVariants: Record<string, 'success' | 'info' | 'warning' | 'destructive'> = {
  new: 'success',
  good: 'info',
  fair: 'warning',
  poor: 'destructive',
};

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();



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
  const [returningAsset, setReturningAsset] = useState<Asset | null>(null);
  const [repairingAsset, setRepairingAsset] = useState<Asset | null>(null);
  const [losingAsset, setLosingAsset] = useState<Asset | null>(null);
  const [viewingAsset, setViewingAsset] = useState<{ assetId: string; tab: 'details' | 'history' } | null>(null);
  const [cloningAsset, setCloningAsset] = useState<Asset | null>(null);
  const [searchParams] = useSearchParams();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: assets = [], isLoading: assetsLoading } = useAssets();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();

  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && assets.length > 0) {
      const asset = assets.find(a => a.id === viewId);
      if (asset) {
        setViewingAsset({ assetId: asset.id, tab: 'details' });
      }
    }
  }, [searchParams, assets]);

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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, locationFilter, vendorFilter, brandFilter, conditionFilter, assignedToFilter]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAssets = filteredAssets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);

  const handleCloneAsset = (asset: Asset) => {
    const clonedAsset = {
      name: `${asset.name} (Copy)`,
      brand: asset.brand,
      model: asset.model,
      serialNumber: '',
      category: asset.category,
      status: 'available' as AssetStatus,
      condition: asset.condition as 'new' | 'good' | 'fair' | 'poor',
      location: asset.location,
      locationId: asset.locationId,
      assignedTo: undefined,
      assignedToId: undefined,
      purchaseDate: asset.purchaseDate,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and track all organizational assets</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => exportToCSV(filteredAssets, 'assets_export')}
            disabled={filteredAssets.length === 0}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <AssetAdditionDialog />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search assets..."
            className="pl-10 w-full rounded-full bg-card border-border/60 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] rounded-full bg-card border-border/60 shadow-sm">
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
            <SelectTrigger className="w-[140px] rounded-full bg-card border-border/60 shadow-sm">
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
            <SelectTrigger className="w-[150px] rounded-full bg-card border-border/60 shadow-sm">
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
              <Button variant="outline" size="icon" className="relative shrink-0 rounded-full bg-card border-border/60 shadow-sm">
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
                      <SelectTrigger><SelectValue placeholder="All Assignees" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignees</SelectItem>
                        {assignees.map((assignee: string) => (
                          <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vendor</Label>
                    <Select value={vendorFilter} onValueChange={setVendorFilter}>
                      <SelectTrigger><SelectValue placeholder="All Vendors" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Vendors</SelectItem>
                        {vendors.map((vendor: string) => (
                          <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Select value={brandFilter} onValueChange={setBrandFilter}>
                      <SelectTrigger><SelectValue placeholder="All Brands" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        {brands.map((brand: string) => (
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select value={conditionFilter} onValueChange={setConditionFilter}>
                      <SelectTrigger><SelectValue placeholder="All Conditions" /></SelectTrigger>
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
      </div>

      {/* ── Mobile card list (< lg) ───────────────────────── */}
      <div className="block lg:hidden rounded-xl overflow-hidden border border-border bg-card">
        {currentAssets.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No assets found matching your criteria
          </p>
        ) : (
          <>
            {currentAssets.map((asset, idx) => {
              const Icon = categoryIcons[asset.category.toLowerCase()] || Package;
              return (
                <div
                  key={asset.id}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-muted/50 transition-colors ${idx < currentAssets.length - 1 ? 'border-b border-border' : ''}`}
                  onClick={() => setViewingAsset({ assetId: asset.id, tab: 'details' })}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[15px] text-foreground leading-snug truncate">{asset.name}</span>
                      <Badge variant={statusVariants[asset.status]} className="shrink-0 text-[11px]">
                        {statusLabels[asset.status]}
                      </Badge>
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                      {asset.brand} · <span className="font-mono">{asset.assetTag}</span>
                    </p>
                    <p className="text-[12px] text-muted-foreground leading-snug">
                      {asset.assignedTo ? asset.assignedTo : (asset.location === 'Warehouse' ? 'Central Warehouse' : asset.location)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                </div>
              );
            })}

            {/* Mobile pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredAssets.length)} of {filteredAssets.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Desktop table (≥ lg) ─────────────────────────── */}
      <div className="hidden lg:block">
        <Card className="border shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
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
              {currentAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No assets found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                currentAssets.map((asset) => {
                  const Icon = categoryIcons[asset.category.toLowerCase()] || Package;
                  return (
                    <TableRow key={asset.id} className="transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted">
                            <Icon className="w-4 h-4 text-primary" />
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
                          <p className="font-mono tabular-nums text-sm">{asset.assetTag}</p>
                          <p className="text-xs text-muted-foreground font-mono tabular-nums">{asset.serialNumber}</p>
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
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="bg-muted text-primary text-[11px] font-medium">
                                {getInitials(asset.assignedTo)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{asset.assignedTo}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={conditionVariants[asset.condition] ?? 'secondary'} className="capitalize">
                          {asset.condition}
                        </Badge>
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
                            <DropdownMenuItem className="gap-2" onClick={() => setViewingAsset({ assetId: asset.id, tab: 'details' })}>
                              <Eye className="w-4 h-4 text-muted-foreground" />View details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => setEditingAsset(asset)}>
                              <Edit2 className="w-4 h-4 text-muted-foreground" />Edit asset
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleCloneAsset(asset)}>
                              <Copy className="w-4 h-4 text-muted-foreground" />Clone asset
                            </DropdownMenuItem>
                            {asset.status === 'available' && (
                              <DropdownMenuItem className="gap-2" onClick={() => setAssigningAsset(asset)}>
                                <UserPlus className="w-4 h-4 text-muted-foreground" />Assign asset
                              </DropdownMenuItem>
                            )}
                            {asset.status === 'assigned' && (
                              <DropdownMenuItem className="gap-2" onClick={() => setReturningAsset(asset)}>
                                <Edit className="w-4 h-4 text-muted-foreground" />Return asset
                              </DropdownMenuItem>
                            )}
                            {(asset.status === 'available' || asset.status === 'assigned' || asset.status === 'repair') && (
                              <DropdownMenuItem className="gap-2" onClick={() => setRepairingAsset(asset)}>
                                <Wrench className="w-4 h-4 text-muted-foreground" />
                                {asset.status === 'repair' ? 'Complete repair' : 'Send for repair'}
                              </DropdownMenuItem>
                            )}
                            {asset.status !== 'lost' && asset.status !== 'retired' && (
                              <DropdownMenuItem className="gap-2" onClick={() => setLosingAsset(asset)}>
                                <AlertTriangle className="w-4 h-4 text-muted-foreground" />Mark as lost
                              </DropdownMenuItem>
                            )}
                            {asset.status === 'lost' && (
                              <DropdownMenuItem className="gap-2" onClick={() => setLosingAsset(asset)}>
                                <CheckCircle className="w-4 h-4 text-muted-foreground" />Mark as found
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="gap-2" onClick={() => setViewingAsset({ assetId: asset.id, tab: 'history' })}>
                              <History className="w-4 h-4 text-muted-foreground" />View history
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => setDeletingAsset(asset)}>
                              <Trash2 className="w-4 h-4" />Delete asset
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
        </Card>

        {/* Desktop Footer Stats and Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {currentAssets.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredAssets.length)} of {filteredAssets.length} assets
          </div>
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={itemsPerPage}
            setPageSize={setItemsPerPage}
          />
        </div>
      </div>

      {/* Dialogs */}
      {editingAsset && (
        <EditAssetDialog
          asset={editingAsset}
          open={!!editingAsset}
          onOpenChange={(open) => !open && setEditingAsset(null)}
        />
      )}
      {deletingAsset && (
        <DeleteAssetDialog
          asset={deletingAsset}
          open={!!deletingAsset}
          onOpenChange={(open) => !open && setDeletingAsset(null)}
        />
      )}
      {assigningAsset && (
        <AssignAssetDialog
          asset={assigningAsset}
          open={!!assigningAsset}
          onOpenChange={(open) => !open && setAssigningAsset(null)}
        />
      )}
      {viewingAsset && (() => {
        const viewingIndex = filteredAssets.findIndex(a => a.id === viewingAsset.assetId);
        if (viewingIndex === -1) return null;
        return (
          <AssetDetailsDialog
            assets={filteredAssets}
            currentIndex={viewingIndex}
            open={!!viewingAsset}
            onOpenChange={(open) => !open && setViewingAsset(null)}
            onNavigate={(index) => setViewingAsset({ assetId: filteredAssets[index].id, tab: viewingAsset.tab })}
            defaultTab={viewingAsset.tab}
            onEdit={setEditingAsset}
            onClone={handleCloneAsset}
            onAssign={setAssigningAsset}
            onReturn={setReturningAsset}
            onRepair={setRepairingAsset}
            onLost={setLosingAsset}
            onDelete={setDeletingAsset}
          />
        );
      })()}
      {cloningAsset && (
        <AddAssetDialog
          asset={cloningAsset}
          open={!!cloningAsset}
          onOpenChange={(open) => !open && setCloningAsset(null)}
          showTrigger={false}
        />
      )}
      {returningAsset && (
        <ReturnAssetDialog
          open={!!returningAsset}
          onOpenChange={(open) => !open && setReturningAsset(null)}
          assetId={returningAsset.id}
        />
      )}
      {repairingAsset && (
        <RepairAssetDialog
          asset={repairingAsset}
          open={!!repairingAsset}
          onOpenChange={(open) => !open && setRepairingAsset(null)}
        />
      )}
      {losingAsset && (
        <LostAssetDialog
          asset={losingAsset}
          open={!!losingAsset}
          onOpenChange={(open) => !open && setLosingAsset(null)}
        />
      )}
    </div>
  );
};

export default Assets;

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    Info,
    History,
    Calendar,
    User,
    MapPin,
    Tag,
    Barcode,
    Zap,
    Clipboard,
    Package,
    ArrowRight
} from 'lucide-react';
import { Asset, AssetStatus, AssetCategory } from '@/types/asset';
import { useAssetAssignments } from '@/hooks/useSupabaseData';
import { format } from 'date-fns';

interface AssetDetailsDialogProps {
    asset: Asset | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: 'details' | 'history';
}

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

const categoryLabels: Record<AssetCategory, string> = {
    laptop: 'Laptop',
    desktop: 'Desktop',
    phone: 'Phone',
    tablet: 'Tablet',
    monitor: 'Monitor',
    accessory: 'Accessory',
    other: 'Other',
};

export function AssetDetailsDialog({ asset, open, onOpenChange, defaultTab = 'details' }: AssetDetailsDialogProps) {
    const { data: assignments = [], isLoading: assignmentsLoading } = useAssetAssignments(asset?.id || '');

    if (!asset) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-2">
                    <div className="flex items-center justify-between pr-8">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-blue/10">
                                <Package className="w-6 h-6 text-brand-blue" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">{asset.name}</DialogTitle>
                                <DialogDescription className="flex items-center gap-2 mt-1">
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{asset.assetTag}</span>
                                    <span className="text-muted-foreground">·</span>
                                    <Badge variant={statusVariants[asset.status]} className="capitalize">
                                        {statusLabels[asset.status]}
                                    </Badge>
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue={defaultTab} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="details" className="gap-2">
                            <Info className="w-4 h-4" />
                            Details
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                            <History className="w-4 h-4" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="flex-1 overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                            {/* General Info */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                                    <Tag className="w-4 h-4" />
                                    General Information
                                </h3>
                                <Card className="p-4 space-y-4 shadow-sm border-border/50">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground italic mb-1">Brand</p>
                                            <p className="text-sm font-medium">{asset.brand}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground italic mb-1">Model</p>
                                            <p className="text-sm font-medium">{asset.model}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground italic mb-1">Category</p>
                                            <p className="text-sm font-medium">{categoryLabels[asset.category] || asset.category}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground italic mb-1">Condition</p>
                                            <Badge variant="outline" className="capitalize text-xs">
                                                {asset.condition}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-border/50">
                                        <p className="text-xs text-muted-foreground italic mb-1 flex items-center gap-1">
                                            <Barcode className="w-3 h-3" />
                                            Serial Number
                                        </p>
                                        <p className="text-sm font-mono break-all bg-muted/50 p-2 rounded">{asset.serialNumber}</p>
                                    </div>
                                </Card>
                            </section>

                            {/* Assignment Info */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                                    <User className="w-4 h-4" />
                                    Assignment Status
                                </h3>
                                <Card className="p-4 space-y-4 shadow-sm border-border/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${asset.status === 'assigned' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-muted text-muted-foreground'}`}>
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground italic mb-0.5">Assigned To</p>
                                            <p className="text-sm font-semibold">
                                                {asset.assignedTo || 'Unassigned'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-brand-green/10 text-brand-green">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground italic mb-0.5">Current Location</p>
                                            <p className="text-sm font-semibold">{asset.location}</p>
                                        </div>
                                    </div>
                                </Card>
                            </section>

                            {/* Financial Info */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                                    <Zap className="w-4 h-4" />
                                    Purchase details
                                </h3>
                                <Card className="p-4 space-y-4 shadow-sm border-border/50">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground italic mb-1">Purchase Date</p>
                                            <p className="text-sm font-medium">
                                                {asset.purchaseDate ? format(new Date(asset.purchaseDate), 'PP') : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground italic mb-1">Cost</p>
                                            <p className="text-sm font-medium">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(asset.purchaseCost)}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-muted-foreground italic mb-1">Vendor</p>
                                            <p className="text-sm font-medium">{asset.vendor}</p>
                                        </div>
                                    </div>
                                    {asset.warrantyEnd && (
                                        <div className="pt-2 border-t border-border/50">
                                            <p className="text-xs text-muted-foreground italic mb-1 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Warranty End
                                            </p>
                                            <p className={`text-sm font-medium ${new Date(asset.warrantyEnd) < new Date() ? 'text-destructive' : ''}`}>
                                                {format(new Date(asset.warrantyEnd), 'PP')}
                                                {new Date(asset.warrantyEnd) < new Date() && ' (Expired)'}
                                            </p>
                                        </div>
                                    )}
                                </Card>
                            </section>

                            {/* Additional Info */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                                    <Clipboard className="w-4 h-4" />
                                    Notes & Metadata
                                </h3>
                                <Card className="p-4 space-y-4 shadow-sm border-border/50 min-h-[140px]">
                                    <div>
                                        <p className="text-xs text-muted-foreground italic mb-1">Last Updated</p>
                                        <p className="text-xs">{asset.updatedAt ? format(new Date(asset.updatedAt), 'PPP p') : 'Never'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground italic mb-1">Notes</p>
                                        <p className="text-sm whitespace-pre-wrap">
                                            {asset.notes || 'No notes available for this asset.'}
                                        </p>
                                    </div>
                                </Card>
                            </section>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="flex-1 overflow-y-auto pr-2">
                        {assignmentsLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                <p>Loading assignment history...</p>
                            </div>
                        ) : assignments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <History className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold text-lg">No History Found</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    This asset hasn't been assigned to anyone yet. All future assignments will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="relative pl-6 space-y-8 pb-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
                                {assignments.map((assignment, index) => (
                                    <div key={assignment.id} className="relative">
                                        {/* Timeline connector dot */}
                                        <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-background ${assignment.returnDate ? 'bg-muted-foreground' : 'bg-brand-blue'}`} />

                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                                    {assignment.employeeName}
                                                    {!assignment.returnDate && (
                                                        <Badge variant="assigned" className="text-[10px] py-0 px-1.5">Current</Badge>
                                                    )}
                                                </h4>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(assignment.assignedDate), 'MMM d, yyyy')}
                                                </span>
                                            </div>

                                            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <ArrowRight className="w-3 h-3" />
                                                    {assignment.returnDate
                                                        ? `Returned on ${format(new Date(assignment.returnDate), 'MMM d, yyyy')}`
                                                        : 'Status: In possession'
                                                    }
                                                </span>
                                            </div>

                                            {assignment.notes && (
                                                <div className="mt-2 text-xs bg-muted/40 p-2 rounded italic text-muted-foreground">
                                                    "{assignment.notes}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

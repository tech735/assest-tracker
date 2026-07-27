import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
    ArrowRight,
    Wrench,
    AlertTriangle,
    CheckCircle,
    UserPlus,
    RotateCcw,
} from 'lucide-react';
import { Asset, AssetStatus, AssetCategory, AssignmentEventType } from '@/types/asset';
import { useAssetAssignments, useSettings } from '@/hooks/useSupabaseData';
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

const eventMeta: Record<AssignmentEventType, { icon: typeof User; label: string }> = {
    assign: { icon: UserPlus, label: 'Assigned' },
    return: { icon: RotateCcw, label: 'Returned' },
    repair_start: { icon: Wrench, label: 'Sent for Repair' },
    repair_end: { icon: Wrench, label: 'Repair Completed' },
    lost: { icon: AlertTriangle, label: 'Marked Lost' },
    found: { icon: CheckCircle, label: 'Marked Found' },
};

export function AssetDetailsDialog({ asset, open, onOpenChange, defaultTab = 'details' }: AssetDetailsDialogProps) {
    const { data: assignments = [], isLoading: assignmentsLoading } = useAssetAssignments(asset?.id || '');
    const { data: settings } = useSettings();

    if (!asset) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[88vh] overflow-hidden flex flex-col p-0">
                {/* Header */}
                <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 border-b border-border shrink-0">
                    <div className="flex items-center gap-3 pr-8">
                        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-blue/10 shrink-0">
                            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-brand-blue" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-lg sm:text-xl leading-tight truncate">{asset.name}</DialogTitle>
                            <DialogDescription asChild className="mt-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{asset.assetTag}</span>
                                    <Badge variant={statusVariants[asset.status]} className="capitalize text-xs">
                                        {statusLabels[asset.status]}
                                    </Badge>
                                </div>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue={defaultTab} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border bg-transparent h-auto px-4 sm:px-6 shrink-0">
                        <TabsTrigger value="details" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                            <Info className="w-4 h-4" />
                            Details
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                            <History className="w-4 h-4" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="divide-y divide-border">
                            {/* General Information */}
                            <section className="px-4 sm:px-6 py-4 sm:py-5">
                                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider mb-4">
                                    <Tag className="w-3.5 h-3.5" />
                                    General Information
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Brand</p>
                                        <p className="text-sm font-medium">{asset.brand}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Model</p>
                                        <p className="text-sm font-medium">{asset.model}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Category</p>
                                        <p className="text-sm font-medium">{categoryLabels[asset.category] || asset.category}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Condition</p>
                                        <Badge variant="outline" className="capitalize text-xs">{asset.condition}</Badge>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                        <Barcode className="w-3 h-3" />Serial Number
                                    </p>
                                    <p className="text-sm font-mono bg-muted/50 px-3 py-2 rounded-lg break-all">{asset.serialNumber}</p>
                                </div>
                            </section>

                            {/* Assignment Status */}
                            <section className="px-4 sm:px-6 py-4 sm:py-5">
                                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider mb-4">
                                    <User className="w-3.5 h-3.5" />
                                    Assignment Status
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${asset.status === 'assigned' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-muted text-muted-foreground'}`}>
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground mb-0.5">Assigned To</p>
                                            <p className="text-sm font-semibold truncate">{asset.assignedTo || 'Unassigned'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-brand-green/10 text-brand-green">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground mb-0.5">Location</p>
                                            <p className="text-sm font-semibold truncate">{asset.location}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Purchase Details */}
                            <section className="px-4 sm:px-6 py-4 sm:py-5">
                                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider mb-4">
                                    <Zap className="w-3.5 h-3.5" />
                                    Purchase Details
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Purchase Date</p>
                                        <p className="text-sm font-medium">
                                            {asset.purchaseDate ? format(new Date(asset.purchaseDate), 'PP') : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Cost</p>
                                        <p className="text-sm font-medium">
                                            {new Intl.NumberFormat(settings?.currency === 'INR' ? 'en-IN' : 'en-US', {
                                                style: 'currency',
                                                currency: settings?.currency || 'USD'
                                            }).format(asset.purchaseCost)}
                                        </p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <p className="text-xs text-muted-foreground mb-1">Vendor</p>
                                        <p className="text-sm font-medium">{asset.vendor}</p>
                                    </div>
                                </div>
                                {asset.warrantyEnd && (
                                    <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-muted/40">
                                        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Warranty End</p>
                                            <p className={`text-sm font-medium ${new Date(asset.warrantyEnd) < new Date() ? 'text-destructive' : ''}`}>
                                                {format(new Date(asset.warrantyEnd), 'PP')}
                                                {new Date(asset.warrantyEnd) < new Date() && ' (Expired)'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Notes */}
                            <section className="px-4 sm:px-6 py-4 sm:py-5">
                                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider mb-4">
                                    <Clipboard className="w-3.5 h-3.5" />
                                    Notes & Metadata
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                                        <p className="text-xs">{asset.updatedAt ? format(new Date(asset.updatedAt), 'PPP p') : 'Never'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                                        <p className="text-sm whitespace-pre-wrap text-foreground/80">
                                            {asset.notes || 'No notes available for this asset.'}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="flex-1 overflow-y-auto scrollbar-hide">
                        {assignmentsLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                <p>Loading assignment history...</p>
                            </div>
                        ) : assignments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <History className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold text-lg">No History Found</h3>
                                <p className="text-muted-foreground max-w-sm mt-1 text-sm">
                                    This asset hasn't been assigned to anyone yet. All future assignments will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="px-4 sm:px-6 py-5">
                                {/* Timeline title */}
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">Timeline</h3>
                                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
                                    {assignments.map((assignment) => {
                                        const isAssignCycle = assignment.eventType === 'assign' || assignment.eventType === 'return';
                                        const isOpenAssignment = assignment.eventType === 'assign' && !assignment.returnDate;
                                        const meta = isAssignCycle
                                            ? (isOpenAssignment ? eventMeta.assign : eventMeta.return)
                                            : (eventMeta[assignment.eventType] || eventMeta.assign);
                                        const EventIcon = meta.icon;
                                        return (
                                            <div key={assignment.id} className="relative">
                                                <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-background ${isOpenAssignment ? 'bg-primary' : 'bg-muted-foreground'}`} />
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                                                            <EventIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                            {meta.label}
                                                            {assignment.employeeName && ` — ${assignment.employeeName}`}
                                                            {isOpenAssignment && (
                                                                <Badge variant="assigned" className="text-[10px] py-0 px-1.5">Current</Badge>
                                                            )}
                                                        </h4>
                                                        <span className="text-xs text-muted-foreground shrink-0">
                                                            {format(new Date(assignment.assignedDate), 'MMM d, yyyy')}
                                                        </span>
                                                    </div>
                                                    {isAssignCycle && (
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                            <ArrowRight className="w-3 h-3 shrink-0" />
                                                            {assignment.returnDate
                                                                ? `Returned on ${format(new Date(assignment.returnDate), 'MMM d, yyyy')}`
                                                                : 'Status: In possession'
                                                            }
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                                                        <span>Condition: <span className="capitalize">{assignment.condition}</span></span>
                                                        {assignment.handedOverBy && <span>Handed over by: {assignment.handedOverBy}</span>}
                                                        {assignment.receivedBy && <span>Received by: {assignment.receivedBy}</span>}
                                                    </div>
                                                    {assignment.notes && (
                                                        <div className="mt-2 text-xs bg-muted/40 px-3 py-2 rounded-lg italic text-muted-foreground">
                                                            "{assignment.notes}"
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

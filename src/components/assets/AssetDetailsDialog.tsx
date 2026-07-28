import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Info,
    History,
    User,
    Tag,
    Zap,
    Clipboard,
    Package,
    ArrowRight,
    Wrench,
    AlertTriangle,
    CheckCircle,
    UserPlus,
    RotateCcw,
    MoreHorizontal,
    Edit2,
    Copy,
    Trash2,
    Laptop,
    Smartphone,
    Monitor,
    Tablet,
    Headphones,
} from 'lucide-react';
import { Asset, AssetStatus, AssetCategory, AssignmentEventType } from '@/types/asset';
import { useAssetAssignments, useEmployees, useSettings } from '@/hooks/useSupabaseData';
import { format } from 'date-fns';
import { InfoCard, Field, DetailNavHeader } from '@/components/ui/detail-card';

interface AssetDetailsDialogProps {
    assets: Asset[];
    currentIndex: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNavigate: (index: number) => void;
    defaultTab?: 'details' | 'history';
    onEdit?: (asset: Asset) => void;
    onClone?: (asset: Asset) => void;
    onAssign?: (asset: Asset) => void;
    onReturn?: (asset: Asset) => void;
    onRepair?: (asset: Asset) => void;
    onLost?: (asset: Asset) => void;
    onDelete?: (asset: Asset) => void;
}

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

const getInitials = (name: string) =>
    name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export function AssetDetailsDialog({
    assets,
    currentIndex,
    open,
    onOpenChange,
    onNavigate,
    defaultTab = 'details',
    onEdit,
    onClone,
    onAssign,
    onReturn,
    onRepair,
    onLost,
    onDelete,
}: AssetDetailsDialogProps) {
    const asset = assets[currentIndex];
    const { data: assignments = [], isLoading: assignmentsLoading } = useAssetAssignments(asset?.id || '');
    const { data: employees = [] } = useEmployees();
    const { data: settings } = useSettings();

    if (!asset) return null;

    const CategoryIcon = categoryIcons[asset.category.toLowerCase()] || Package;
    const assignee = employees.find((e) => e.id === asset.assignedToId);
    const activeAssignment = assignments.find((a) => a.eventType === 'assign' && !a.returnDate);
    const currency = new Intl.NumberFormat(settings?.currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency: settings?.currency || 'USD',
    });
    const warrantyExpired = asset.warrantyEnd ? new Date(asset.warrantyEnd) < new Date() : false;

    const primaryAction = (() => {
        switch (asset.status) {
            case 'available':
                return onAssign ? { label: 'Assign Asset', icon: UserPlus, onClick: () => onAssign(asset) } : null;
            case 'assigned':
                return onReturn ? { label: 'Return Asset', icon: RotateCcw, onClick: () => onReturn(asset) } : null;
            case 'repair':
                return onRepair ? { label: 'Complete Repair', icon: Wrench, onClick: () => onRepair(asset) } : null;
            case 'lost':
                return onLost ? { label: 'Mark as Found', icon: CheckCircle, onClick: () => onLost(asset) } : null;
            default:
                return null;
        }
    })();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
                <DetailNavHeader index={currentIndex} total={assets.length} onNavigate={onNavigate} />

                {/* Identity row */}
                <div className="px-4 sm:px-6 py-4 flex items-start gap-3 border-b border-border shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <CategoryIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                        <SheetTitle className="text-base font-medium leading-tight truncate">{asset.name}</SheetTitle>
                        <SheetDescription asChild>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {categoryLabels[asset.category] || asset.category} · Added {format(new Date(asset.createdAt), 'PP')}
                            </p>
                        </SheetDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2" onClick={() => onEdit?.(asset)}>
                                    <Edit2 className="w-4 h-4 text-muted-foreground" />Edit asset
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2" onClick={() => onClone?.(asset)}>
                                    <Copy className="w-4 h-4 text-muted-foreground" />Clone asset
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => onDelete?.(asset)}>
                                    <Trash2 className="w-4 h-4" />Delete asset
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {primaryAction && (
                            <Button size="sm" className="gap-1.5" onClick={primaryAction.onClick}>
                                <primaryAction.icon className="w-4 h-4" />
                                {primaryAction.label}
                            </Button>
                        )}
                    </div>
                </div>

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
                        <div className="p-4 sm:p-6 space-y-4">
                            {/* Assigned To */}
                            <InfoCard title="Assigned To" icon={User}>
                                {asset.assignedTo ? (
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10">
                                            {assignee?.avatarUrl && <AvatarImage src={assignee.avatarUrl} />}
                                            <AvatarFallback className="bg-muted text-primary text-sm font-medium">
                                                {getInitials(asset.assignedTo)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{asset.assignedTo}</p>
                                            {assignee?.position && (
                                                <p className="text-xs text-muted-foreground truncate">{assignee.position}</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Unassigned</p>
                                )}
                                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                                    <Field label="Location" value={asset.location} />
                                    <Field
                                        label={activeAssignment ? 'Assigned On' : 'Status'}
                                        value={
                                            activeAssignment
                                                ? format(new Date(activeAssignment.assignedDate), 'PP')
                                                : <Badge variant={statusVariants[asset.status]}>{statusLabels[asset.status]}</Badge>
                                        }
                                    />
                                </div>
                            </InfoCard>

                            {/* Purchase & Value */}
                            <InfoCard title="Purchase & Value" icon={Zap}>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Buy Price" value={currency.format(asset.purchaseCost || 0)} />
                                    <Field
                                        label="Purchase Date"
                                        value={asset.purchaseDate ? format(new Date(asset.purchaseDate), 'PP') : 'N/A'}
                                    />
                                    <Field label="Vendor" value={asset.vendor || 'N/A'} />
                                    <Field
                                        label="Warranty End"
                                        value={
                                            asset.warrantyEnd
                                                ? `${format(new Date(asset.warrantyEnd), 'PP')}${warrantyExpired ? ' (Expired)' : ''}`
                                                : 'N/A'
                                        }
                                        className={warrantyExpired ? 'text-destructive' : ''}
                                    />
                                </div>
                            </InfoCard>

                            {/* Specification */}
                            <InfoCard title="Specification" icon={Tag}>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Brand" value={asset.brand} />
                                    <Field label="Model" value={asset.model} />
                                    <Field label="Category" value={categoryLabels[asset.category] || asset.category} />
                                    <Field label="Serial Number" value={asset.serialNumber} mono />
                                </div>
                                <div className="mt-4 pt-4 border-t border-border">
                                    <p className="text-xs text-muted-foreground mb-1">Condition</p>
                                    <Badge variant="outline" className="capitalize text-xs">{asset.condition}</Badge>
                                </div>
                            </InfoCard>

                            {/* Notes */}
                            <InfoCard title="Notes & Metadata" icon={Clipboard}>
                                <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                                <p className="text-xs mb-3">{asset.updatedAt ? format(new Date(asset.updatedAt), 'PPP p') : 'Never'}</p>
                                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                                <p className="text-sm whitespace-pre-wrap text-foreground/80">
                                    {asset.notes || 'No notes available for this asset.'}
                                </p>
                            </InfoCard>
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
                                <h3 className="font-medium text-base">No History Found</h3>
                                <p className="text-muted-foreground max-w-sm mt-1 text-sm">
                                    This asset hasn't been assigned to anyone yet. All future assignments will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="px-4 sm:px-6 py-5">
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-5">Timeline</h3>
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
                                                        <h4 className="font-medium text-sm flex items-center gap-2 flex-wrap">
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
            </SheetContent>
        </Sheet>
    );
}

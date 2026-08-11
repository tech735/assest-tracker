import { useEffect, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBulkUpdateAssets, useBulkMarkAssetsLost } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

// Only status transitions that don't require extra per-asset workflow data
// (a receiving location, repair vendor, etc.) are offered here. "Assigned" and
// "Repair" stay behind their dedicated flows (Assign / Repair dialogs) since
// they need that extra data to keep the assignment history accurate.
const STATUS_OPTIONS = [
    { value: 'available', label: 'Available' },
    { value: 'retired', label: 'Retired' },
    { value: 'lost', label: 'Lost' },
] as const;

type BulkStatus = (typeof STATUS_OPTIONS)[number]['value'];

interface BulkChangeStatusDialogProps {
    assetIds: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone?: () => void;
}

export function BulkChangeStatusDialog({ assetIds, open, onOpenChange, onDone }: BulkChangeStatusDialogProps) {
    const { toast } = useToast();
    const bulkUpdateAssets = useBulkUpdateAssets();
    const bulkMarkLost = useBulkMarkAssetsLost();

    const [status, setStatus] = useState<BulkStatus | ''>('');
    const [notes, setNotes] = useState('');

    const isPending = bulkUpdateAssets.isPending || bulkMarkLost.isPending;

    useEffect(() => {
        if (open) {
            setStatus('');
            setNotes('');
        }
    }, [open]);

    const onSubmit = async () => {
        if (!status) return;
        try {
            if (status === 'lost') {
                await bulkMarkLost.mutateAsync({ ids: assetIds, notes: notes || undefined });
            } else {
                await bulkUpdateAssets.mutateAsync({
                    ids: assetIds,
                    updates: status === 'available'
                        ? { status, assignedTo: null, assignedToId: null }
                        : { status },
                });
            }

            toast({
                title: 'Status Updated',
                description: `${assetIds.length} asset(s) marked as ${STATUS_OPTIONS.find((o) => o.value === status)?.label}.`,
            });

            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update asset status. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <RefreshCcw className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>Change Status</DialogTitle>
                    </div>
                    <DialogDescription>
                        Update the status for {assetIds.length} selected asset{assetIds.length === 1 ? '' : 's'}.
                        {status === 'available' && ' This clears any current assignment but does not log a formal return event.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                        <Label>New Status</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as BulkStatus)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {status === 'lost' && (
                        <div className="space-y-1.5">
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                placeholder="e.g., Reported missing during audit"
                                className="resize-none"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="bg-brand-blue hover:bg-brand-blue/90"
                        onClick={onSubmit}
                        disabled={isPending || !status}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update Status'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

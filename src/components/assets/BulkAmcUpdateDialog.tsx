import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { useBulkUpdateAssets } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

interface BulkAmcUpdateDialogProps {
    assetIds: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone?: () => void;
}

export function BulkAmcUpdateDialog({ assetIds, open, onOpenChange, onDone }: BulkAmcUpdateDialogProps) {
    const { toast } = useToast();
    const bulkUpdateAssets = useBulkUpdateAssets();

    const [amcStartDate, setAmcStartDate] = useState('');
    const [amcEndDate, setAmcEndDate] = useState('');

    useEffect(() => {
        if (open) {
            setAmcStartDate('');
            setAmcEndDate('');
        }
    }, [open]);

    const onSubmit = async () => {
        if (!amcStartDate && !amcEndDate) return;
        try {
            await bulkUpdateAssets.mutateAsync({
                ids: assetIds,
                updates: {
                    ...(amcStartDate ? { amcStartDate } : {}),
                    ...(amcEndDate ? { amcEndDate } : {}),
                },
            });

            toast({
                title: 'AMC Dates Updated',
                description: `AMC dates applied to ${assetIds.length} asset(s).`,
            });

            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update AMC dates. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>Set AMC Dates</DialogTitle>
                    </div>
                    <DialogDescription>
                        Apply AMC start/end dates to {assetIds.length} selected asset{assetIds.length === 1 ? '' : 's'}.
                        Leave a field blank to leave that date unchanged.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-1.5">
                        <Label>AMC Start Date</Label>
                        <DatePicker value={amcStartDate} onChange={setAmcStartDate} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>AMC End Date</Label>
                        <DatePicker value={amcEndDate} onChange={setAmcEndDate} />
                    </div>
                </div>

                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={bulkUpdateAssets.isPending}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="bg-brand-blue hover:bg-brand-blue/90"
                        onClick={onSubmit}
                        disabled={bulkUpdateAssets.isPending || (!amcStartDate && !amcEndDate)}
                    >
                        {bulkUpdateAssets.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Apply AMC Dates'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

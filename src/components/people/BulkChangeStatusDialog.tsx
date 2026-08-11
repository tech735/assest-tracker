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
import { useBulkUpdateEmployees } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types/asset';

// "Offboarded" is intentionally excluded here — it has its own dedicated bulk
// action (see BulkOffboardDialog) because it also needs to return any assets
// still assigned to the employee first.
const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'on-leave', label: 'On Leave' },
    { value: 'remote', label: 'Remote' },
] as const;

type BulkStatus = (typeof STATUS_OPTIONS)[number]['value'];

interface BulkChangeStatusDialogProps {
    employeeIds: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone?: () => void;
}

export function BulkChangeStatusDialog({ employeeIds, open, onOpenChange, onDone }: BulkChangeStatusDialogProps) {
    const { toast } = useToast();
    const bulkUpdateEmployees = useBulkUpdateEmployees();
    const [status, setStatus] = useState<BulkStatus | ''>('');

    useEffect(() => {
        if (open) setStatus('');
    }, [open]);

    const onSubmit = async () => {
        if (!status) return;
        try {
            await bulkUpdateEmployees.mutateAsync({
                ids: employeeIds,
                updates: { status: status as Employee['status'] },
            });

            toast({
                title: 'Status Updated',
                description: `${employeeIds.length} employee(s) marked as ${STATUS_OPTIONS.find((o) => o.value === status)?.label}.`,
            });

            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update status. Please try again.',
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
                        Update the status for {employeeIds.length} selected employee{employeeIds.length === 1 ? '' : 's'}.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-1.5">
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

                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={bulkUpdateEmployees.isPending}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="bg-brand-blue hover:bg-brand-blue/90"
                        onClick={onSubmit}
                        disabled={bulkUpdateEmployees.isPending || !status}
                    >
                        {bulkUpdateEmployees.isPending ? (
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

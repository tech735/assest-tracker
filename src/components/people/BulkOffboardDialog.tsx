import { useMemo, useState } from 'react';
import { Loader2, UserMinus, Package } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { useAssets, useBulkOffboardEmployees } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types/asset';

const today = () => new Date().toISOString().split('T')[0];

interface BulkOffboardDialogProps {
    employees: Employee[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone?: () => void;
}

export function BulkOffboardDialog({ employees, open, onOpenChange, onDone }: BulkOffboardDialogProps) {
    const { toast } = useToast();
    const { data: assets = [] } = useAssets();
    const bulkOffboard = useBulkOffboardEmployees();
    const [exitDate, setExitDate] = useState(today());

    const employeeIds = employees.map((e) => e.id);
    const activeAssets = useMemo(
        () => assets.filter((a) => a.status === 'assigned' && a.assignedToId && employeeIds.includes(a.assignedToId)),
        [assets, employeeIds]
    );

    const onOffboard = async () => {
        try {
            await bulkOffboard.mutateAsync({ ids: employeeIds, exitDate });
            toast({
                title: 'Employees Offboarded',
                description: `${employees.length} employee(s) have been marked as offboarded${activeAssets.length > 0 ? ` and ${activeAssets.length} asset(s) were collected` : ''}.`,
            });
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to offboard employees. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
                            <UserMinus className="w-5 h-5 text-destructive" />
                        </div>
                        <AlertDialogTitle>Offboard {employees.length} Employee{employees.length === 1 ? '' : 's'}</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>
                                This will mark the selected employees as offboarded. Their profiles and history are kept, they just won't show up as active.
                            </p>
                            {activeAssets.length > 0 && (
                                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-foreground">
                                    <p className="font-medium mb-2">
                                        {activeAssets.length} asset(s) will be collected and returned to inventory:
                                    </p>
                                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                                        {activeAssets.map((asset) => (
                                            <li key={asset.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Package className="w-3 h-3 shrink-0" />
                                                {asset.name} ({asset.assetTag})
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label htmlFor="bulk-exit-date" className="text-foreground">Exit Date</Label>
                                <DatePicker id="bulk-exit-date" value={exitDate} onChange={setExitDate} />
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel asChild>
                        <Button variant="outline" disabled={bulkOffboard.isPending}>
                            Cancel
                        </Button>
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={onOffboard}
                        disabled={bulkOffboard.isPending || !exitDate}
                        className="gap-2"
                    >
                        {bulkOffboard.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Offboarding...
                            </>
                        ) : activeAssets.length > 0 ? (
                            'Return Assets & Offboard'
                        ) : (
                            'Confirm Offboarding'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

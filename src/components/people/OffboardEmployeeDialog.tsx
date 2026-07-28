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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { useAssets, useReturnAsset, useLocations, useOffboardEmployee } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types/asset';

const today = () => new Date().toISOString().split('T')[0];

interface OffboardEmployeeDialogProps {
    employee: Employee;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OffboardEmployeeDialog({ employee, open, onOpenChange }: OffboardEmployeeDialogProps) {
    const { toast } = useToast();
    const { data: assets = [] } = useAssets();
    const { data: locations = [] } = useLocations();
    const returnAsset = useReturnAsset();
    const offboardEmployee = useOffboardEmployee();
    const [exitDate, setExitDate] = useState(today());
    const [isProcessing, setIsProcessing] = useState(false);

    const activeAssets = useMemo(
        () => assets.filter(a => a.status === 'assigned' && a.assignedToId === employee.id),
        [assets, employee.id]
    );

    const onOffboard = async () => {
        setIsProcessing(true);
        try {
            if (activeAssets.length > 0) {
                const coreOffice = locations.find(l => l.name === 'Core Office');
                for (const asset of activeAssets) {
                    await returnAsset.mutateAsync({
                        assetId: asset.id,
                        condition: asset.condition,
                        receivedBy: 'IT (Offboarding)',
                        notes: `Collected as part of offboarding ${employee.name}.`,
                        locationId: coreOffice?.id,
                        locationName: coreOffice?.name,
                    });
                }
            }

            await offboardEmployee.mutateAsync({ id: employee.id, exitDate });

            toast({
                title: 'Employee Offboarded',
                description: `${employee.name} has been marked as offboarded${activeAssets.length > 0 ? ` and ${activeAssets.length} asset(s) were collected` : ''}.`,
            });
            onOpenChange(false);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to offboard employee. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
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
                        <AlertDialogTitle>Offboard Employee</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>
                                This will mark
                                <span className="font-semibold text-foreground mx-1">"{employee.name}"</span>
                                as offboarded. Their profile and history are kept, they just won't show up as active.
                            </p>
                            {activeAssets.length > 0 && (
                                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-foreground">
                                    <p className="font-medium mb-2">
                                        {activeAssets.length} asset(s) will be collected and returned to inventory:
                                    </p>
                                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                                        {activeAssets.map(asset => (
                                            <li key={asset.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Package className="w-3 h-3 shrink-0" />
                                                {asset.name} ({asset.assetTag})
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label htmlFor="exit-date" className="text-foreground">Exit Date</Label>
                                <DatePicker
                                    id="exit-date"
                                    value={exitDate}
                                    onChange={setExitDate}
                                />
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel asChild>
                        <Button variant="outline" disabled={isProcessing}>
                            Cancel
                        </Button>
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={onOffboard}
                        disabled={isProcessing || !exitDate}
                        className="gap-2"
                    >
                        {isProcessing ? (
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

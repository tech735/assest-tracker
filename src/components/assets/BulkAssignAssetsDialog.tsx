import { useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { useAssets, useEmployees, useAssignAssetsBundle } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { AssetCondition } from '@/types/asset';

const today = () => new Date().toISOString().split('T')[0];

interface BulkAssignAssetsDialogProps {
    assetIds: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone?: () => void;
}

export function BulkAssignAssetsDialog({ assetIds, open, onOpenChange, onDone }: BulkAssignAssetsDialogProps) {
    const { toast } = useToast();
    const { data: assets = [] } = useAssets();
    const { data: employees = [] } = useEmployees();
    const assignBundle = useAssignAssetsBundle();

    const [employeeId, setEmployeeId] = useState('');
    const [handoverDate, setHandoverDate] = useState(today());
    const [handedOverBy, setHandedOverBy] = useState('');
    const [condition, setCondition] = useState<AssetCondition>('good');
    const [notes, setNotes] = useState('');

    // Only currently-available assets can be assigned without first going through
    // a return; assets already assigned/in-repair/lost/retired are skipped here so
    // this can't silently overwrite an open assignment.
    const selectedAssets = assets.filter((a) => assetIds.includes(a.id));
    const eligibleAssets = selectedAssets.filter((a) => a.status === 'available');
    const skippedCount = selectedAssets.length - eligibleAssets.length;

    useEffect(() => {
        if (open) {
            setEmployeeId('');
            setHandoverDate(today());
            setHandedOverBy('');
            setCondition('good');
            setNotes('');
        }
    }, [open]);

    const onSubmit = async () => {
        if (!employeeId || eligibleAssets.length === 0 || !handedOverBy) return;
        try {
            const employee = employees.find((e) => e.id === employeeId);
            await assignBundle.mutateAsync({
                assetIds: eligibleAssets.map((a) => a.id),
                employeeId,
                handoverDate,
                handedOverBy,
                condition,
                notes: notes || undefined,
            });

            toast({
                title: 'Assets Assigned',
                description: `${eligibleAssets.length} asset(s) have been assigned to ${employee?.name || 'the selected employee'}.`,
            });

            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to assign assets. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <UserPlus className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>Assign {selectedAssets.length} Asset{selectedAssets.length === 1 ? '' : 's'}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {skippedCount > 0
                            ? `${eligibleAssets.length} of ${selectedAssets.length} selected assets are available and will be assigned. ${skippedCount} not currently available will be skipped.`
                            : 'Assign the selected assets to an employee.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                        <Label>Employee</Label>
                        <Select value={employeeId} onValueChange={setEmployeeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        {emp.name} ({emp.department})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Handover Date</Label>
                            <DatePicker value={handoverDate} onChange={setHandoverDate} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Condition</Label>
                            <Select value={condition} onValueChange={(v) => setCondition(v as AssetCondition)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="good">Good</SelectItem>
                                    <SelectItem value="fair">Fair</SelectItem>
                                    <SelectItem value="poor">Poor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Handed Over By</Label>
                        <Input placeholder="e.g., IT Admin name" value={handedOverBy} onChange={(e) => setHandedOverBy(e.target.value)} />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            placeholder="e.g., Bulk assigned for new team setup"
                            className="resize-none"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={assignBundle.isPending}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="bg-brand-blue hover:bg-brand-blue/90"
                        onClick={onSubmit}
                        disabled={assignBundle.isPending || !employeeId || eligibleAssets.length === 0 || !handedOverBy}
                    >
                        {assignBundle.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Assigning...
                            </>
                        ) : (
                            `Assign ${eligibleAssets.length || ''} Asset${eligibleAssets.length === 1 ? '' : 's'}`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

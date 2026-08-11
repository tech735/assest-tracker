import { useEffect, useState } from 'react';
import { Loader2, Building2 } from 'lucide-react';
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

// Same fixed department list used by EditEmployeeDialog / AddEmployeeDialog.
const DEPARTMENTS = [
    'Business Development',
    'Customer Experience',
    'Ecommerce',
    'Finance & Accounts',
    'Brand & Design',
    'Operations',
    'Technology',
    'Management',
];

interface BulkChangeDepartmentDialogProps {
    employeeIds: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone?: () => void;
}

export function BulkChangeDepartmentDialog({ employeeIds, open, onOpenChange, onDone }: BulkChangeDepartmentDialogProps) {
    const { toast } = useToast();
    const bulkUpdateEmployees = useBulkUpdateEmployees();
    const [department, setDepartment] = useState('');

    useEffect(() => {
        if (open) setDepartment('');
    }, [open]);

    const onSubmit = async () => {
        if (!department) return;
        try {
            await bulkUpdateEmployees.mutateAsync({
                ids: employeeIds,
                updates: { department },
            });

            toast({
                title: 'Department Updated',
                description: `${employeeIds.length} employee(s) moved to ${department}.`,
            });

            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update department. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>Change Department</DialogTitle>
                    </div>
                    <DialogDescription>
                        Move {employeeIds.length} selected employee{employeeIds.length === 1 ? '' : 's'} to a different department.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-1.5">
                    <Label>Department</Label>
                    <Select value={department} onValueChange={setDepartment}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                            {DEPARTMENTS.map((dept) => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
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
                        disabled={bulkUpdateEmployees.isPending || !department}
                    >
                        {bulkUpdateEmployees.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update Department'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

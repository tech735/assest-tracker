import { Loader2, AlertTriangle } from 'lucide-react';
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
import { useBulkDeleteEmployees } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

interface BulkDeleteEmployeesDialogProps {
    employeeIds: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone?: () => void;
}

export function BulkDeleteEmployeesDialog({ employeeIds, open, onOpenChange, onDone }: BulkDeleteEmployeesDialogProps) {
    const { toast } = useToast();
    const bulkDeleteEmployees = useBulkDeleteEmployees();

    const onDelete = async () => {
        try {
            await bulkDeleteEmployees.mutateAsync(employeeIds);
            toast({
                title: 'Employees Deleted',
                description: `${employeeIds.length} employee(s) have been permanently deleted.`,
            });
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete employees. Please try again.',
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
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                        </div>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete
                        <span className="font-semibold text-foreground mx-1">{employeeIds.length} employee{employeeIds.length === 1 ? '' : 's'}</span>
                        from the database. Consider offboarding instead if you want to keep their history.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel asChild>
                        <Button variant="outline" disabled={bulkDeleteEmployees.isPending}>
                            Cancel
                        </Button>
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={onDelete}
                        disabled={bulkDeleteEmployees.isPending}
                        className="gap-2"
                    >
                        {bulkDeleteEmployees.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            `Delete ${employeeIds.length} Employee${employeeIds.length === 1 ? '' : 's'}`
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

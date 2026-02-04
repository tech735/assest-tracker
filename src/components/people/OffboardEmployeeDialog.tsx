import { Loader2, UserMinus } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useDeleteEmployee } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types/asset';

interface OffboardEmployeeDialogProps {
    employee: Employee;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OffboardEmployeeDialog({ employee, open, onOpenChange }: OffboardEmployeeDialogProps) {
    const { toast } = useToast();
    const deleteEmployee = useDeleteEmployee();

    const onOffboard = async () => {
        try {
            await deleteEmployee.mutateAsync(employee.id);
            toast({
                title: 'Employee Offboarded',
                description: `${employee.name} has been successfully removed from the system.`,
            });
            onOpenChange(false);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to offboard employee. Please check if they still have assigned assets.',
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
                        <AlertDialogTitle>Offboard Employee</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription>
                        Are you sure you want to offboard
                        <span className="font-semibold text-foreground mx-1">"{employee.name}"</span>?
                        This will permanently remove their profile from the system.
                        <p className="mt-2 text-sm text-destructive font-medium">
                            Note: Employees with active asset assignments cannot be removed until all assets are checked back in.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel asChild>
                        <Button variant="outline" disabled={deleteEmployee.isPending}>
                            Cancel
                        </Button>
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={onOffboard}
                        disabled={deleteEmployee.isPending}
                        className="gap-2"
                    >
                        {deleteEmployee.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Offboarding...
                            </>
                        ) : (
                            'Confirm Offboarding'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

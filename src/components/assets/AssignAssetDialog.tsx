import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateAssignment, useEmployees, useUpdateAsset, useAssets } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Asset } from '@/types/asset';

const assignmentSchema = z.object({
    assetId: z.string().min(1, { message: 'Asset is required.' }),
    employeeId: z.string().min(1, { message: 'Employee is required.' }),
    notes: z.string().optional(),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface AssignAssetDialogProps {
    asset?: Asset; // Made optional
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AssignAssetDialog({ asset, open, onOpenChange }: AssignAssetDialogProps) {
    const { toast } = useToast();
    const createAssignment = useCreateAssignment();
    const updateAsset = useUpdateAsset();
    const { data: employees = [] } = useEmployees();
    const { data: assets = [] } = useAssets();

    // Filter only available assets if no specific asset is provided
    const availableAssets = assets.filter(a => a.status === 'available');

    const form = useForm<AssignmentFormValues>({
        resolver: zodResolver(assignmentSchema),
        defaultValues: {
            assetId: asset?.id || '',
            employeeId: '',
            notes: '',
        },
    });

    // Reset form when asset or open state changes
    useEffect(() => {
        if (open) {
            form.reset({
                assetId: asset?.id || '',
                employeeId: '',
                notes: '',
            });
        }
    }, [asset, open, form]);

    const onSubmit = async (values: AssignmentFormValues) => {
        try {
            const selectedAsset = asset || assets.find(a => a.id === values.assetId);
            const selectedEmployee = employees.find(e => e.id === values.employeeId);

            if (!selectedAsset) {
                throw new Error('Asset not found');
            }

            await createAssignment.mutateAsync({
                assetId: selectedAsset.id,
                assetTag: selectedAsset.assetTag,
                assetName: selectedAsset.name,
                employeeId: values.employeeId,
                employeeName: selectedEmployee?.name || 'Unknown',
                assignedDate: new Date().toISOString(),
                condition: selectedAsset.condition,
                notes: values.notes || '',
            });

            // Also update the asset status and assigned_to fields
            await updateAsset.mutateAsync({
                id: selectedAsset.id,
                updates: {
                    status: 'assigned',
                    assignedTo: selectedEmployee?.name || 'Unknown',
                    assignedToId: values.employeeId,
                }
            });

            toast({
                title: 'Asset Assigned',
                description: `${selectedAsset.name} has been assigned to ${selectedEmployee?.name}.`,
            });

            onOpenChange(false);
            form.reset();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to assign asset. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <UserPlus className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>Assign Asset</DialogTitle>
                    </div>
                    <DialogDescription>
                        {asset
                            ? <>Assign <span className="font-semibold text-foreground">"{asset.name}"</span> ({asset.assetTag}) to an employee.</>
                            : "Select an available asset and assign it to an employee."
                        }
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        {!asset && (
                            <FormField
                                control={form.control}
                                name="assetId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Asset</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an available asset" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {availableAssets.length > 0 ? (
                                                    availableAssets.map((a) => (
                                                        <SelectItem key={a.id} value={a.id}>
                                                            {a.name} ({a.assetTag})
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <div className="py-2 px-4 text-sm text-muted-foreground">
                                                        No available assets
                                                    </div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="employeeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Employee</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an employee" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {employees.map((emp) => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                    {emp.name} ({emp.department})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assignment Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="e.g., Assigned for remote work"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={createAssignment.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-brand-blue hover:bg-brand-blue/90"
                                disabled={createAssignment.isPending || (!asset && availableAssets.length === 0)}
                            >
                                {createAssignment.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Assigning...
                                    </>
                                ) : (
                                    'Assign Asset'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, PackagePlus } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAssets, useAssignAssetsBundle } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types/asset';

const today = () => new Date().toISOString().split('T')[0];

const bundleSchema = z.object({
    assetIds: z.array(z.string()).min(1, { message: 'Select at least one asset.' }),
    handoverDate: z.string().min(1, { message: 'Handover date is required.' }),
    handedOverBy: z.string().min(1, { message: 'Handed over by is required.' }),
    condition: z.enum(['new', 'good', 'fair', 'poor'], { required_error: 'Condition is required.' }),
    notes: z.string().optional(),
});

type BundleFormValues = z.infer<typeof bundleSchema>;

interface BundleAssignDialogProps {
    employee: Employee;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BundleAssignDialog({ employee, open, onOpenChange }: BundleAssignDialogProps) {
    const { toast } = useToast();
    const assignBundle = useAssignAssetsBundle();
    const { data: assets = [] } = useAssets();
    const availableAssets = assets.filter(a => a.status === 'available');

    const form = useForm<BundleFormValues>({
        resolver: zodResolver(bundleSchema),
        defaultValues: {
            assetIds: [],
            handoverDate: today(),
            handedOverBy: '',
            condition: 'good',
            notes: '',
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                assetIds: [],
                handoverDate: today(),
                handedOverBy: '',
                condition: 'good',
                notes: '',
            });
        }
    }, [open, form]);

    const onSubmit = async (values: BundleFormValues) => {
        try {
            await assignBundle.mutateAsync({
                assetIds: values.assetIds,
                employeeId: employee.id,
                handoverDate: values.handoverDate,
                handedOverBy: values.handedOverBy,
                condition: values.condition,
                notes: values.notes,
            });

            toast({
                title: 'Assets Assigned',
                description: `${values.assetIds.length} asset(s) have been assigned to ${employee.name}.`,
            });

            onOpenChange(false);
            form.reset();
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
                        <PackagePlus className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>Assign Multiple Assets</DialogTitle>
                    </div>
                    <DialogDescription>
                        Assign a bundle of assets to <span className="font-semibold text-foreground">{employee.name}</span> in a single handover.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="assetIds"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Assets</FormLabel>
                                    <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                                        {availableAssets.length > 0 ? (
                                            availableAssets.map((a) => (
                                                <FormField
                                                    key={a.id}
                                                    control={form.control}
                                                    name="assetIds"
                                                    render={({ field }) => {
                                                        const checked = field.value?.includes(a.id);
                                                        return (
                                                            <label className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                                                                <Checkbox
                                                                    checked={checked}
                                                                    onCheckedChange={(value) => {
                                                                        if (value) {
                                                                            field.onChange([...(field.value || []), a.id]);
                                                                        } else {
                                                                            field.onChange((field.value || []).filter((id) => id !== a.id));
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="flex-1 truncate">{a.name} ({a.assetTag})</span>
                                                            </label>
                                                        );
                                                    }}
                                                />
                                            ))
                                        ) : (
                                            <div className="py-3 px-3 text-sm text-muted-foreground">No available assets</div>
                                        )}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="handoverDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Handover Date</FormLabel>
                                        <FormControl>
                                            <DatePicker value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="condition"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Condition</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select condition" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="new">New</SelectItem>
                                                <SelectItem value="good">Good</SelectItem>
                                                <SelectItem value="fair">Fair</SelectItem>
                                                <SelectItem value="poor">Poor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="handedOverBy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Handed Over By</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., IT Admin name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., New joinee kit" className="resize-none" {...field} />
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
                                disabled={assignBundle.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-brand-blue hover:bg-brand-blue/90"
                                disabled={assignBundle.isPending || availableAssets.length === 0}
                            >
                                {assignBundle.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Assigning...
                                    </>
                                ) : (
                                    'Assign Assets'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

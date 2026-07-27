import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Wrench } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useStartRepair, useEndRepair } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Asset } from '@/types/asset';

const startRepairSchema = z.object({
    vendor: z.string().min(1, { message: 'Vendor is required.' }),
    estReturn: z.string().optional(),
    cost: z.string().optional(),
    notes: z.string().optional(),
});

const endRepairSchema = z.object({
    condition: z.enum(['new', 'good', 'fair', 'poor'], { required_error: 'Condition is required.' }),
    notes: z.string().optional(),
});

interface RepairAssetDialogProps {
    asset: Asset | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function RepairAssetDialog({ asset, open, onOpenChange }: RepairAssetDialogProps) {
    const { toast } = useToast();
    const startRepair = useStartRepair();
    const endRepair = useEndRepair();
    const isEnding = asset?.status === 'repair';

    const startForm = useForm<z.infer<typeof startRepairSchema>>({
        resolver: zodResolver(startRepairSchema),
        defaultValues: { vendor: '', estReturn: '', cost: '', notes: '' },
    });

    const endForm = useForm<z.infer<typeof endRepairSchema>>({
        resolver: zodResolver(endRepairSchema),
        defaultValues: { condition: asset?.condition || 'good', notes: '' },
    });

    if (!asset) return null;

    const onStartSubmit = async (values: z.infer<typeof startRepairSchema>) => {
        try {
            await startRepair.mutateAsync({
                assetId: asset.id,
                vendor: values.vendor,
                estReturn: values.estReturn || undefined,
                cost: values.cost ? Number(values.cost) : undefined,
                notes: values.notes,
            });
            toast({ title: 'Repair Started', description: `${asset.name} has been sent for repair.` });
            onOpenChange(false);
            startForm.reset();
        } catch {
            toast({ title: 'Error', description: 'Failed to start repair. Please try again.', variant: 'destructive' });
        }
    };

    const onEndSubmit = async (values: z.infer<typeof endRepairSchema>) => {
        try {
            await endRepair.mutateAsync({
                assetId: asset.id,
                condition: values.condition,
                notes: values.notes,
            });
            toast({ title: 'Repair Completed', description: `${asset.name} is back in inventory.` });
            onOpenChange(false);
            endForm.reset();
        } catch {
            toast({ title: 'Error', description: 'Failed to complete repair. Please try again.', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <Wrench className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>{isEnding ? 'Complete Repair' : 'Send for Repair'}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {isEnding
                            ? <>Record the condition of <span className="font-semibold text-foreground">"{asset.name}"</span> as it returns from repair.</>
                            : <>Send <span className="font-semibold text-foreground">"{asset.name}"</span> ({asset.assetTag}) out for repair.</>
                        }
                    </DialogDescription>
                </DialogHeader>

                {isEnding ? (
                    <Form {...endForm}>
                        <form onSubmit={endForm.handleSubmit(onEndSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={endForm.control}
                                name="condition"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Condition After Repair</FormLabel>
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
                            <FormField
                                control={endForm.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g., Screen replaced" className="resize-none" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={endRepair.isPending}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-brand-blue hover:bg-brand-blue/90" disabled={endRepair.isPending}>
                                    {endRepair.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Mark Repair Complete'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                ) : (
                    <Form {...startForm}>
                        <form onSubmit={startForm.handleSubmit(onStartSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={startForm.control}
                                name="vendor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Repair Vendor</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., ABC Repairs" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={startForm.control}
                                    name="estReturn"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Est. Return Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={startForm.control}
                                    name="cost"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Est. Cost</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={startForm.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g., Battery not charging" className="resize-none" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={startRepair.isPending}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-brand-blue hover:bg-brand-blue/90" disabled={startRepair.isPending}>
                                    {startRepair.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Send for Repair'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}

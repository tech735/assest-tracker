import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, RotateCcw } from 'lucide-react';
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
import { useAssets, useReturnAsset, useLocations } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

const returnSchema = z.object({
    assetId: z.string().min(1, { message: 'Asset is required.' }),
    condition: z.enum(['new', 'good', 'fair', 'poor'], { required_error: 'Condition is required.' }),
    receivedBy: z.string().min(1, { message: 'Received by is required.' }),
    notes: z.string().optional(),
});

type ReturnFormValues = z.infer<typeof returnSchema>;

interface ReturnAssetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetId?: string;
}

export function ReturnAssetDialog({ open, onOpenChange, assetId }: ReturnAssetDialogProps) {
    const { toast } = useToast();
    const returnAsset = useReturnAsset();
    const { data: assets = [] } = useAssets();

    // Filter only assigned assets
    const assignedAssets = assets.filter(asset => asset.status === 'assigned');
    const preselectedAsset = assetId ? assets.find(a => a.id === assetId) : undefined;

    const form = useForm<ReturnFormValues>({
        resolver: zodResolver(returnSchema),
        defaultValues: {
            assetId: assetId || '',
            condition: preselectedAsset?.condition || 'good',
            receivedBy: '',
            notes: '',
        },
    });

    const { data: locations = [] } = useLocations();

    const onSubmit = async (values: ReturnFormValues) => {
        try {
            const selectedAsset = assets.find(a => a.id === values.assetId);
            const coreOffice = locations.find(l => l.name === 'Core Office');

            await returnAsset.mutateAsync({
                assetId: values.assetId,
                condition: values.condition,
                receivedBy: values.receivedBy,
                notes: values.notes,
                locationId: coreOffice?.id,
                locationName: coreOffice?.name
            });

            toast({
                title: 'Asset Returned',
                description: `${selectedAsset?.name} has been successfully returned to inventory.`,
            });

            onOpenChange(false);
            form.reset();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to return asset. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <RotateCcw className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>Return Asset</DialogTitle>
                    </div>
                    <DialogDescription>
                        {assetId
                            ? 'Confirm returning this asset to inventory.'
                            : 'Select an assigned asset to return it to the inventory.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        {assetId ? (
                            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                                <div className="font-medium">
                                    {preselectedAsset?.name ?? 'Selected asset'}
                                </div>
                                <div className="text-muted-foreground">
                                    {preselectedAsset?.assetTag ? `${preselectedAsset.assetTag} · ` : ''}
                                    {preselectedAsset?.assignedTo ?? 'Currently assigned'}
                                </div>
                            </div>
                        ) : (
                            <FormField
                                control={form.control}
                                name="assetId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assigned Asset</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an assigned asset" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {assignedAssets.length > 0 ? (
                                                    assignedAssets.map((asset) => (
                                                        <SelectItem key={asset.id} value={asset.id}>
                                                            {asset.name} ({asset.assetTag}) - {asset.assignedTo}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <div className="py-2 px-4 text-sm text-muted-foreground">
                                                        No assets currently assigned
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
                            name="condition"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Condition on Return</FormLabel>
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
                            control={form.control}
                            name="receivedBy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Received By</FormLabel>
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
                                    <FormLabel>Return Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="e.g., Minor scratch on lid"
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
                                disabled={returnAsset.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-brand-blue hover:bg-brand-blue/90"
                                disabled={
                                    returnAsset.isPending ||
                                    (assetId ? !preselectedAsset : assignedAssets.length === 0) ||
                                    !form.getValues('assetId')
                                }
                            >
                                {returnAsset.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Returning...
                                    </>
                                ) : (
                                    'Return Asset'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

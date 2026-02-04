import { useState } from 'react';
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
import { useAssets, useReturnAsset } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

const returnSchema = z.object({
    assetId: z.string().min(1, { message: 'Asset is required.' }),
});

type ReturnFormValues = z.infer<typeof returnSchema>;

interface ReturnAssetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ReturnAssetDialog({ open, onOpenChange }: ReturnAssetDialogProps) {
    const { toast } = useToast();
    const returnAsset = useReturnAsset();
    const { data: assets = [] } = useAssets();

    // Filter only assigned assets
    const assignedAssets = assets.filter(asset => asset.status === 'assigned');

    const form = useForm<ReturnFormValues>({
        resolver: zodResolver(returnSchema),
        defaultValues: {
            assetId: '',
        },
    });

    const onSubmit = async (values: ReturnFormValues) => {
        try {
            const selectedAsset = assets.find(a => a.id === values.assetId);

            await returnAsset.mutateAsync(values.assetId);

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
                        Select an assigned asset to return it to the inventory.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                                disabled={returnAsset.isPending || assignedAssets.length === 0}
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

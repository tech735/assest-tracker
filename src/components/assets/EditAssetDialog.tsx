import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateAsset, useLocations, useAssets, useSettings } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Asset, AssetCategory, AssetCondition, AssetStatus } from '@/types/asset';

const assetSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    brand: z.string().min(1, { message: 'Brand is required.' }),
    model: z.string().min(1, { message: 'Model is required.' }),
    serialNumber: z.string().min(1, { message: 'Serial number is required.' }),
    assetTag: z.string().min(1, { message: 'Asset tag is required.' }),
    category: z.string().min(1, { message: 'Category is required.' }),
    locationId: z.string().min(1, { message: 'Location is required.' }),
    purchaseDate: z.string().min(1, { message: 'Purchase date is required.' }),
    purchaseCost: z.number().min(0, { message: 'Cost must be positive.' }),
    vendor: z.string().min(1, { message: 'Vendor is required.' }),
    warrantyStart: z.string().optional().nullable(),
    warrantyEnd: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    condition: z.string().default('good'),
    status: z.string().default('available'),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface EditAssetDialogProps {
    asset: Asset;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditAssetDialog({ asset, open, onOpenChange }: EditAssetDialogProps) {
    const { toast } = useToast();
    const updateAsset = useUpdateAsset();
    const { data: locations = [] } = useLocations();
    const { data: assets = [] } = useAssets();

    const { data: settings } = useSettings();

    // Derive categories from both settings and existing assets
    const settingsCategories = settings?.categories || [];
    const assetCategories = Array.from(new Set(assets.map(a => a.category).filter(Boolean)));

    // Combine and normalize
    const categories = Array.from(new Set([
        ...settingsCategories,
        ...assetCategories
    ].map(cat => cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase())))
        .sort();

    const normalizeCategory = (cat: string) => cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
    const findLocationId = (locName: string) => locations.find(l => l.name === locName || (l.name === 'Warehouse' && locName === 'Central Warehouse'))?.id || '';

    const form = useForm<AssetFormValues>({
        resolver: zodResolver(assetSchema),
        defaultValues: {
            name: asset.name,
            brand: asset.brand,
            model: asset.model,
            serialNumber: asset.serialNumber,
            assetTag: asset.assetTag,
            category: normalizeCategory(asset.category),
            locationId: asset.locationId || findLocationId(asset.location),
            purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
            purchaseCost: Number(asset.purchaseCost) || 0,
            vendor: asset.vendor || '',
            warrantyStart: asset.warrantyStart ? new Date(asset.warrantyStart).toISOString().split('T')[0] : '',
            warrantyEnd: asset.warrantyEnd ? new Date(asset.warrantyEnd).toISOString().split('T')[0] : '',
            notes: asset.notes || '',
            condition: asset.condition,
            status: asset.status,
        },
    });

    // Reset form when asset changes or locations are loaded
    useEffect(() => {
        if (open && asset && locations.length > 0) {
            form.reset({
                name: asset.name,
                brand: asset.brand,
                model: asset.model,
                serialNumber: asset.serialNumber,
                assetTag: asset.assetTag,
                category: normalizeCategory(asset.category),
                locationId: asset.locationId || findLocationId(asset.location),
                purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
                purchaseCost: Number(asset.purchaseCost) || 0,
                vendor: asset.vendor || '',
                warrantyStart: asset.warrantyStart ? new Date(asset.warrantyStart).toISOString().split('T')[0] : '',
                warrantyEnd: asset.warrantyEnd ? new Date(asset.warrantyEnd).toISOString().split('T')[0] : '',
                notes: asset.notes || '',
                condition: asset.condition,
                status: asset.status,
            });
        }
    }, [asset, open, form, locations]);

    const onSubmit = async (values: AssetFormValues) => {
        try {
            const selectedLocation = locations.find(l => l.id === values.locationId);

            // Ensure location is properly selected
            if (!values.locationId || !selectedLocation) {
                throw new Error('Please select a valid location');
            }

            await updateAsset.mutateAsync({
                id: asset.id,
                updates: {
                    ...values,
                    category: values.category as AssetCategory,
                    condition: values.condition as AssetCondition,
                    status: values.status as AssetStatus,
                    location: selectedLocation.name, // Use the actual location name
                    locationId: selectedLocation.id, // Ensure locationId is set correctly
                    purchaseCost: Number(values.purchaseCost),
                    warrantyStart: values.warrantyStart || null,
                    warrantyEnd: values.warrantyEnd || null,
                    notes: values.notes || null,
                } as Partial<Asset>,
            });

            toast({
                title: 'Asset Updated',
                description: `${values.name} has been successfully updated.`,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error updating asset:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to update asset. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Asset</DialogTitle>
                    <DialogDescription>
                        Update the details of the asset.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Asset Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="assetTag"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Asset Tag</FormLabel>
                                        <FormControl>
                                            <Input {...field} readOnly className="bg-muted cursor-not-allowed" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="brand"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Brand</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Model</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="serialNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Serial Number</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map((cat: string) => (
                                                    <SelectItem key={cat} value={cat}>
                                                        {cat}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="locationId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select location" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {locations.map((loc) => (
                                                    <SelectItem key={loc.id} value={loc.id}>
                                                        {loc.name === 'Warehouse' ? 'Central Warehouse' : loc.name}
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="available">Available</SelectItem>
                                                <SelectItem value="assigned">Assigned</SelectItem>
                                                <SelectItem value="repair">In Repair</SelectItem>
                                                <SelectItem value="lost">Lost</SelectItem>
                                                <SelectItem value="retired">Retired</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="purchaseCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Purchase Cost</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="purchaseDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Purchase Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="warrantyEnd"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Warranty Expiry</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            className="resize-none"
                                            {...field}
                                            value={field.value || ''}
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
                                disabled={updateAsset.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-brand-blue hover:bg-brand-blue/90"
                                disabled={updateAsset.isPending}
                            >
                                {updateAsset.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

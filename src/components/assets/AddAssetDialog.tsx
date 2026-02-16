import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { useCreateAsset, useLocations, useSettings, useAssets } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { AssetCategory, AssetCondition } from '@/types/asset';
import { Asset } from '@/types/asset';

const assetSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    brand: z.string().min(1, { message: 'Brand is required.' }),
    model: z.string().min(1, { message: 'Model is required.' }),
    serialNumber: z.string().min(1, { message: 'Serial number is required.' }),
    assetTag: z.string().optional(),
    category: z.string().min(1, { message: 'Category is required.' }),
    locationId: z.string().min(1, { message: 'Location is required.' }),
    purchaseDate: z.string().min(1, { message: 'Purchase date is required.' }),
    purchaseCost: z.number().min(0, { message: 'Cost must be positive.' }),
    vendor: z.string().min(1, { message: 'Vendor is required.' }),
    warrantyStart: z.string().optional(),
    warrantyEnd: z.string().optional(),
    notes: z.string().optional(),
    condition: z.string().default('good'),
    status: z.string().default('available'),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface AddAssetDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    showTrigger?: boolean;
    asset?: Asset; // Optional asset for pre-filling data (used for cloning)
}

export function AddAssetDialog({
    open: externalOpen,
    onOpenChange: setExternalOpen,
    showTrigger = true,
    asset
}: AddAssetDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = (val: boolean) => {
        if (setExternalOpen) setExternalOpen(val);
        setInternalOpen(val);
    };

    const { toast } = useToast();
    const createAsset = useCreateAsset();
    const { data: assets = [] } = useAssets();
    const { data: locations = [] } = useLocations();

    const { data: settings } = useSettings();

    // Derive categories from both settings and existing assets
    const settingsCategories = settings?.categories || [];
    const assetCategories = Array.from(new Set(assets.map(a => a.category).filter(Boolean)));

    // Combine and normalize: unique by lowercase comparison, but keep original case if possible
    const categories = Array.from(new Set([
        ...settingsCategories,
        ...assetCategories
    ].map(cat => cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase())))
        .sort();

    const form = useForm<AssetFormValues>({
        resolver: zodResolver(assetSchema),
        defaultValues: {
            name: asset?.name || '',
            brand: asset?.brand || '',
            model: asset?.model || '',
            serialNumber: asset?.serialNumber || '',
            assetTag: asset?.assetTag || '',
            category: asset?.category || '',
            locationId: asset?.locationId || '',
            purchaseDate: asset?.purchaseDate || new Date().toISOString().split('T')[0],
            purchaseCost: asset?.purchaseCost || 0,
            vendor: asset?.vendor || '',
            warrantyStart: asset?.warrantyStart ? new Date(asset.warrantyStart).toISOString().split('T')[0] : '',
            warrantyEnd: asset?.warrantyEnd ? new Date(asset.warrantyEnd).toISOString().split('T')[0] : '',
            notes: asset?.notes || '',
            condition: asset?.condition || 'good',
            status: asset?.status || 'available',
        },
    });

    // Reset form when asset prop changes (for cloning)
    useEffect(() => {
        form.reset({
            name: asset?.name || '',
            brand: asset?.brand || '',
            model: asset?.model || '',
            serialNumber: asset?.serialNumber || '',
            assetTag: asset?.assetTag || '',
            category: asset?.category || '',
            locationId: asset?.locationId || '',
            purchaseDate: asset?.purchaseDate || new Date().toISOString().split('T')[0],
            purchaseCost: asset?.purchaseCost || 0,
            vendor: asset?.vendor || '',
            warrantyStart: asset?.warrantyStart ? new Date(asset.warrantyStart).toISOString().split('T')[0] : '',
            warrantyEnd: asset?.warrantyEnd ? new Date(asset.warrantyEnd).toISOString().split('T')[0] : '',
            notes: asset?.notes || '',
            condition: asset?.condition || 'good',
            status: asset?.status || 'available',
        });
    }, [asset, form]);

    const onSubmit = async (values: AssetFormValues) => {
        try {
            // Find location name for the selected ID
            const selectedLocation = locations.find(l => l.id === values.locationId);

            console.log('Creating asset with values:', values);
            console.log('Selected location:', selectedLocation);
            console.log('Location ID:', values.locationId);

            // Ensure location is properly selected
            if (!values.locationId || !selectedLocation) {
                throw new Error('Please select a valid location');
            }

            await createAsset.mutateAsync({
                name: values.name,
                brand: values.brand,
                model: values.model,
                serialNumber: values.serialNumber,
                assetTag: values.assetTag || '',
                category: values.category as AssetCategory,
                condition: values.condition as AssetCondition,
                status: values.status as any,
                location: selectedLocation.name, // Use the actual location name
                locationId: selectedLocation.id, // Ensure locationId is set correctly
                purchaseDate: values.purchaseDate,
                purchaseCost: Number(values.purchaseCost),
                vendor: values.vendor,
                warrantyStart: values.warrantyStart || undefined,
                warrantyEnd: values.warrantyEnd || undefined,
                notes: values.notes || undefined,
            });

            toast({
                title: 'Asset Created',
                description: `${values.name} has been successfully added.`,
            });

            setOpen(false);
            form.reset();
        } catch (error) {
            console.error('Error creating asset:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to create asset. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {showTrigger && (
                <DialogTrigger asChild>
                    <Button className="gap-2 bg-brand-blue hover:bg-brand-blue/90">
                        <Plus className="w-4 h-4" />
                        Add Asset
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Asset</DialogTitle>
                    <DialogDescription>
                        Enter the details of the new organizational asset.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Asset Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="MacBook Pro 14\" {...field} />
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
                                            <Input placeholder="Apple" {...field} />
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
                                            <Input placeholder="M3 Max" {...field} />
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
                                            <Input placeholder="SN12345678" {...field} />
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
                                name="purchaseCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Purchase Cost</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
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
                                name="vendor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vendor</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Vendor Name" {...field} />
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
                                            <Input type="date" {...field} />
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
                                            placeholder="Additional details about the asset..."
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
                                onClick={() => setOpen(false)}
                                disabled={createAsset.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-brand-blue hover:bg-brand-blue/90"
                                disabled={createAsset.isPending}
                            >
                                {createAsset.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Asset'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

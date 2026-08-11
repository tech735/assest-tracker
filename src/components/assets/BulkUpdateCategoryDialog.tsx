import { useEffect, useState } from 'react';
import { Loader2, Tag } from 'lucide-react';
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
import { useAssets, useSettings, useBulkUpdateAssets } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { AssetCategory } from '@/types/asset';

interface BulkUpdateCategoryDialogProps {
    assetIds: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone?: () => void;
}

export function BulkUpdateCategoryDialog({ assetIds, open, onOpenChange, onDone }: BulkUpdateCategoryDialogProps) {
    const { toast } = useToast();
    const { data: assets = [] } = useAssets();
    const { data: settings } = useSettings();
    const bulkUpdateAssets = useBulkUpdateAssets();

    const settingsCategories = settings?.categories || [];
    const assetCategories = Array.from(new Set(assets.map((a) => a.category).filter(Boolean)));
    const categories = Array.from(new Set([...settingsCategories, ...assetCategories]
        .map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase())))
        .sort();

    const [category, setCategory] = useState('');

    useEffect(() => {
        if (open) setCategory('');
    }, [open]);

    const onSubmit = async () => {
        if (!category) return;
        try {
            await bulkUpdateAssets.mutateAsync({
                ids: assetIds,
                updates: { category: category as AssetCategory },
            });

            toast({
                title: 'Category Updated',
                description: `${assetIds.length} asset(s) updated to ${category}.`,
            });

            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update category. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <Tag className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>Update Category</DialogTitle>
                    </div>
                    <DialogDescription>
                        Set the category for {assetIds.length} selected asset{assetIds.length === 1 ? '' : 's'}.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-1.5">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={bulkUpdateAssets.isPending}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="bg-brand-blue hover:bg-brand-blue/90"
                        onClick={onSubmit}
                        disabled={bulkUpdateAssets.isPending || !category}
                    >
                        {bulkUpdateAssets.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update Category'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

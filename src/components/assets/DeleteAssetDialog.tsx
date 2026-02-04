import { Loader2, AlertTriangle } from 'lucide-react';
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
import { useDeleteAsset } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Asset } from '@/types/asset';

interface DeleteAssetDialogProps {
    asset: Asset;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteAssetDialog({ asset, open, onOpenChange }: DeleteAssetDialogProps) {
    const { toast } = useToast();
    const deleteAsset = useDeleteAsset();

    const onDelete = async () => {
        try {
            await deleteAsset.mutateAsync(asset.id);
            toast({
                title: 'Asset Deleted',
                description: `${asset.name} has been successfully deleted.`,
            });
            onOpenChange(false);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete asset. Please try again.',
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
                        This action cannot be undone. This will permanently delete the asset
                        <span className="font-semibold text-foreground mx-1">"{asset.name}"</span>
                        ({asset.assetTag}) and all its history from the database.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel asChild>
                        <Button variant="outline" disabled={deleteAsset.isPending}>
                            Cancel
                        </Button>
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={onDelete}
                        disabled={deleteAsset.isPending}
                        className="gap-2"
                    >
                        {deleteAsset.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Asset'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

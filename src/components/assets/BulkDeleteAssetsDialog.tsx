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
import { useBulkDeleteAssets } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

interface BulkDeleteAssetsDialogProps {
    assetIds: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone?: () => void;
}

export function BulkDeleteAssetsDialog({ assetIds, open, onOpenChange, onDone }: BulkDeleteAssetsDialogProps) {
    const { toast } = useToast();
    const bulkDeleteAssets = useBulkDeleteAssets();

    const onDelete = async () => {
        try {
            await bulkDeleteAssets.mutateAsync(assetIds);
            toast({
                title: 'Assets Deleted',
                description: `${assetIds.length} asset(s) have been permanently deleted.`,
            });
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete assets. Please try again.',
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
                        This action cannot be undone. This will permanently delete
                        <span className="font-semibold text-foreground mx-1">{assetIds.length} asset{assetIds.length === 1 ? '' : 's'}</span>
                        and all of their history from the database.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel asChild>
                        <Button variant="outline" disabled={bulkDeleteAssets.isPending}>
                            Cancel
                        </Button>
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={onDelete}
                        disabled={bulkDeleteAssets.isPending}
                        className="gap-2"
                    >
                        {bulkDeleteAssets.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            `Delete ${assetIds.length} Asset${assetIds.length === 1 ? '' : 's'}`
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

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
import { useDeleteLocation } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Location } from '@/types/asset';

interface DeleteLocationDialogProps {
    location: Location;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteLocationDialog({ location, open, onOpenChange }: DeleteLocationDialogProps) {
    const { toast } = useToast();
    const deleteLocation = useDeleteLocation();

    const onDelete = async () => {
        try {
            await deleteLocation.mutateAsync(location.id);
            toast({
                title: 'Location Deleted',
                description: `${location.name} has been successfully deleted.`,
            });
            onOpenChange(false);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete location. It may still be linked to assets or employees.',
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
                        This action cannot be undone. This will permanently delete the location
                        <span className="font-semibold text-foreground mx-1">"{location.name}"</span>
                        from the database.
                        <p className="mt-2 text-sm text-destructive font-medium">
                            Note: Locations with active assets or assigned employees cannot be deleted until they are moved or removed.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel asChild>
                        <Button variant="outline" disabled={deleteLocation.isPending}>
                            Cancel
                        </Button>
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={onDelete}
                        disabled={deleteLocation.isPending}
                        className="gap-2"
                    >
                        {deleteLocation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Location'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

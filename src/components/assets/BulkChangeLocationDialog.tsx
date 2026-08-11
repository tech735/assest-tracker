import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
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
import { useLocations, useBulkUpdateAssets } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

interface BulkChangeLocationDialogProps {
    assetIds: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone?: () => void;
}

export function BulkChangeLocationDialog({ assetIds, open, onOpenChange, onDone }: BulkChangeLocationDialogProps) {
    const { toast } = useToast();
    const { data: locations = [] } = useLocations();
    const bulkUpdateAssets = useBulkUpdateAssets();

    const [locationId, setLocationId] = useState('');

    useEffect(() => {
        if (open) setLocationId('');
    }, [open]);

    const onSubmit = async () => {
        const location = locations.find((l) => l.id === locationId);
        if (!location) return;
        try {
            await bulkUpdateAssets.mutateAsync({
                ids: assetIds,
                updates: { locationId: location.id, location: location.name },
            });

            toast({
                title: 'Location Updated',
                description: `${assetIds.length} asset(s) moved to ${location.name === 'Warehouse' ? 'Central Warehouse' : location.name}.`,
            });

            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update location. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>Change Location</DialogTitle>
                    </div>
                    <DialogDescription>
                        Move {assetIds.length} selected asset{assetIds.length === 1 ? '' : 's'} to a different location.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-1.5">
                    <Label>Location</Label>
                    <Select value={locationId} onValueChange={setLocationId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                            {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                    {loc.name === 'Warehouse' ? 'Central Warehouse' : loc.name}
                                </SelectItem>
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
                        disabled={bulkUpdateAssets.isPending || !locationId}
                    >
                        {bulkUpdateAssets.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Move Assets'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

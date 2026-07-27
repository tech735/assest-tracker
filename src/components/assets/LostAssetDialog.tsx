import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
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
import { useMarkLost, useMarkFound } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Asset } from '@/types/asset';

const markLostSchema = z.object({
    reference: z.string().optional(),
    notes: z.string().optional(),
});

const markFoundSchema = z.object({
    condition: z.enum(['new', 'good', 'fair', 'poor'], { required_error: 'Condition is required.' }),
    notes: z.string().optional(),
});

interface LostAssetDialogProps {
    asset: Asset | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LostAssetDialog({ asset, open, onOpenChange }: LostAssetDialogProps) {
    const { toast } = useToast();
    const markLost = useMarkLost();
    const markFound = useMarkFound();
    const isFound = asset?.status === 'lost';

    const lostForm = useForm<z.infer<typeof markLostSchema>>({
        resolver: zodResolver(markLostSchema),
        defaultValues: { reference: '', notes: '' },
    });

    const foundForm = useForm<z.infer<typeof markFoundSchema>>({
        resolver: zodResolver(markFoundSchema),
        defaultValues: { condition: asset?.condition || 'good', notes: '' },
    });

    if (!asset) return null;

    const onLostSubmit = async (values: z.infer<typeof markLostSchema>) => {
        try {
            await markLost.mutateAsync({ assetId: asset.id, reference: values.reference, notes: values.notes });
            toast({ title: 'Asset Marked Lost', description: `${asset.name} has been marked as lost.` });
            onOpenChange(false);
            lostForm.reset();
        } catch {
            toast({ title: 'Error', description: 'Failed to mark asset as lost. Please try again.', variant: 'destructive' });
        }
    };

    const onFoundSubmit = async (values: z.infer<typeof markFoundSchema>) => {
        try {
            await markFound.mutateAsync({ assetId: asset.id, condition: values.condition, notes: values.notes });
            toast({ title: 'Asset Found', description: `${asset.name} is back in inventory.` });
            onOpenChange(false);
            foundForm.reset();
        } catch {
            toast({ title: 'Error', description: 'Failed to mark asset as found. Please try again.', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        {isFound ? <CheckCircle className="w-5 h-5 text-brand-blue" /> : <AlertTriangle className="w-5 h-5 text-destructive" />}
                        <DialogTitle>{isFound ? 'Mark as Found' : 'Mark as Lost'}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {isFound
                            ? <>Record <span className="font-semibold text-foreground">"{asset.name}"</span> as recovered and return it to inventory.</>
                            : <>Mark <span className="font-semibold text-foreground">"{asset.name}"</span> ({asset.assetTag}) as lost.</>
                        }
                    </DialogDescription>
                </DialogHeader>

                {isFound ? (
                    <Form {...foundForm}>
                        <form onSubmit={foundForm.handleSubmit(onFoundSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={foundForm.control}
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
                            <FormField
                                control={foundForm.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g., Found in the store room" className="resize-none" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={markFound.isPending}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-brand-blue hover:bg-brand-blue/90" disabled={markFound.isPending}>
                                    {markFound.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Mark as Found'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                ) : (
                    <Form {...lostForm}>
                        <form onSubmit={lostForm.handleSubmit(onLostSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={lostForm.control}
                                name="reference"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>FIR / Reference No. (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., FIR-2026-00123" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={lostForm.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g., Last seen at client site" className="resize-none" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={markLost.isPending}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="destructive" disabled={markLost.isPending}>
                                    {markLost.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Mark as Lost'
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

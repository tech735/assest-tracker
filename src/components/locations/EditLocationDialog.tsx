import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { useUpdateLocation } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Location } from '@/types/asset';

const locationSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    type: z.enum(['office', 'warehouse', 'remote', 'outlet']),
    address: z.string().min(1, { message: 'Address is required.' }),
});

type LocationFormValues = z.infer<typeof locationSchema>;

interface EditLocationDialogProps {
    location: Location;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditLocationDialog({ location, open, onOpenChange }: EditLocationDialogProps) {
    const { toast } = useToast();
    const updateLocation = useUpdateLocation();

    const form = useForm<LocationFormValues>({
        resolver: zodResolver(locationSchema),
        defaultValues: {
            name: location.name,
            type: location.type,
            address: location.address || '',
        },
    });

    useEffect(() => {
        if (open && location) {
            form.reset({
                name: location.name,
                type: location.type,
                address: location.address || '',
            });
        }
    }, [location, open, form]);

    const onSubmit = async (values: LocationFormValues) => {
        try {
            await updateLocation.mutateAsync({
                id: location.id,
                updates: values as Partial<Location>,
            });

            toast({
                title: 'Location Updated',
                description: `${values.name} has been successfully updated.`,
            });

            onOpenChange(false);
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>Edit Location</DialogTitle>
                    </div>
                    <DialogDescription>
                        Update the details for this workspace.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Location Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Location Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="office">Office</SelectItem>
                                            <SelectItem value="warehouse">Warehouse</SelectItem>
                                            <SelectItem value="remote">Remote</SelectItem>
                                            <SelectItem value="outlet">Outlet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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
                                disabled={updateLocation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-brand-blue hover:bg-brand-blue/90"
                                disabled={updateLocation.isPending}
                            >
                                {updateLocation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
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

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Loader2, MapPin } from 'lucide-react';
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
import { useCreateLocation } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

const locationSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    type: z.enum(['office', 'warehouse', 'remote', 'outlet']),
    address: z.string().min(1, { message: 'Address is required.' }),
});

type LocationFormValues = z.infer<typeof locationSchema>;

export function AddLocationDialog() {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const createLocation = useCreateLocation();

    const form = useForm<LocationFormValues>({
        resolver: zodResolver(locationSchema),
        defaultValues: {
            name: '',
            type: 'office',
            address: '',
        },
    });

    const onSubmit = async (values: LocationFormValues) => {
        try {
            await createLocation.mutateAsync({
                ...values,
                assetsCount: 0,
                employeesCount: 0,
            } as any);

            toast({
                title: 'Location Created',
                description: `${values.name} has been successfully added.`,
            });

            setOpen(false);
            form.reset();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to create location. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-brand-blue hover:bg-brand-blue/90">
                    <Plus className="w-4 h-4" />
                    Add Location
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-5 h-5 text-brand-blue" />
                        <DialogTitle>Add New Location</DialogTitle>
                    </div>
                    <DialogDescription>
                        Create a new office, warehouse, or remote location.
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
                                        <Input placeholder="e.g., London HQ" {...field} />
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
                                        <Input placeholder="123 Business St, City" {...field} />
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
                                disabled={createLocation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-brand-blue hover:bg-brand-blue/90"
                                disabled={createLocation.isPending}
                            >
                                {createLocation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Location'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

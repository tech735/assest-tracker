import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBulkUpdateAssets } from '@/hooks/useSupabaseData';
import { useAddAssetsToContract, useContracts } from '@/hooks/useCollab';
import { useToast } from '@/hooks/use-toast';
import { COVERAGE_META } from '@/lib/contracts';
import { formatDate } from '@/lib/assetMeta';

interface BulkAmcUpdateDialogProps {
    assetIds: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone?: () => void;
}

const CUSTOM = '__custom';

export function BulkAmcUpdateDialog({ assetIds, open, onOpenChange, onDone }: BulkAmcUpdateDialogProps) {
    const { toast } = useToast();
    const bulkUpdateAssets = useBulkUpdateAssets();
    const addToContract = useAddAssetsToContract();
    const { data: contracts = [] } = useContracts();
    const amcContracts = contracts.filter((c) => c.kind === 'amc');

    const [contractId, setContractId] = useState(CUSTOM);
    const [amcStartDate, setAmcStartDate] = useState('');
    const [amcEndDate, setAmcEndDate] = useState('');

    useEffect(() => {
        if (open) {
            setContractId(CUSTOM);
            setAmcStartDate('');
            setAmcEndDate('');
        }
    }, [open]);

    const contract = amcContracts.find((c) => c.id === contractId);
    const pending = bulkUpdateAssets.isPending || addToContract.isPending;
    const count = `${assetIds.length} asset${assetIds.length === 1 ? '' : 's'}`;

    const onSubmit = async () => {
        try {
            if (contract) {
                await addToContract.mutateAsync({ contract, ids: assetIds });
                toast({ title: 'AMC applied', description: `${count} now on ${contract.vendor} AMC until ${formatDate(contract.endDate)}.` });
            } else {
                if (!amcStartDate && !amcEndDate) return;
                await bulkUpdateAssets.mutateAsync({
                    ids: assetIds,
                    updates: {
                        ...(amcStartDate ? { amcStartDate } : {}),
                        ...(amcEndDate ? { amcEndDate } : {}),
                    },
                });
                toast({ title: 'AMC dates updated', description: `Applied to ${count}.` });
            }
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast({
                title: 'Couldn’t update AMC',
                description: error instanceof Error ? error.message : 'Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle>Set AMC</DialogTitle>
                    <DialogDescription>Put {count} under an AMC contract, or set dates by hand.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    {amcContracts.length > 0 && (
                        <div className="grid gap-1.5">
                            <Label>Contract</Label>
                            <Select value={contractId} onValueChange={setContractId}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {amcContracts.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.vendor}{c.reference ? ` · ${c.reference}` : ''} · until {formatDate(c.endDate)}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value={CUSTOM}>No contract — custom dates</SelectItem>
                                </SelectContent>
                            </Select>
                            {contract && (
                                <p className="text-xs text-muted-foreground">
                                    {formatDate(contract.startDate)} → {formatDate(contract.endDate)} · {COVERAGE_META[contract.coverage].label} ({COVERAGE_META[contract.coverage].hint.toLowerCase()})
                                </p>
                            )}
                        </div>
                    )}
                    {!contract && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                                <Label>AMC start</Label>
                                <DatePicker value={amcStartDate} onChange={setAmcStartDate} className="h-[38px] w-full" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>AMC end</Label>
                                <DatePicker value={amcEndDate} onChange={setAmcEndDate} className="h-[38px] w-full" />
                            </div>
                            <p className="col-span-2 -mt-2 text-xs text-muted-foreground">Leave a date blank to keep the current one.</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={onSubmit} loading={pending} disabled={!contract && !amcStartDate && !amcEndDate}>
                        {contract ? 'Apply contract' : 'Apply dates'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

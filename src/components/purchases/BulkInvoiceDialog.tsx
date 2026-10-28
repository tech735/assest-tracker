import * as React from 'react';
import { Plus } from 'lucide-react';
import type { PurchaseInvoice } from '@/types/asset';
import { useLinkAssetsToInvoice, usePurchaseInvoices } from '@/hooks/usePurchases';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/assetMeta';
import { InvoiceDialog } from './InvoiceDialog';
import { invoiceLabel } from '@/services/purchaseService';

/** Assets list → bulk "Invoice": put the selected assets on an existing or new purchase invoice. */
export function BulkInvoiceDialog({ assetIds, open, onOpenChange, onDone }: { assetIds: string[]; open: boolean; onOpenChange: (o: boolean) => void; onDone?: () => void }) {
  const { toast } = useToast();
  const { data: invoices = [], error } = usePurchaseInvoices(open);
  const link = useLinkAssetsToInvoice();
  const [invoiceId, setInvoiceId] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const count = `${assetIds.length} asset${assetIds.length === 1 ? '' : 's'}`;

  React.useEffect(() => {
    if (open) setInvoiceId('');
  }, [open]);

  const apply = async (inv: PurchaseInvoice) => {
    try {
      await link.mutateAsync({ invoice: inv, ids: assetIds, link: true });
      toast({ title: 'Invoice linked', description: `${count} now on ${invoiceLabel(inv)}.` });
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast({ title: 'Couldn’t link the invoice', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    }
  };
  const chosen = invoices.find((i) => i.id === invoiceId);

  return (
    <>
      <Dialog open={open && !creating} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Link {count} to an invoice</DialogTitle>
            <DialogDescription>Their vendor and purchase date are set from the invoice.</DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="text-sm text-muted-foreground">Purchase invoices aren’t available for your role.</p>
          ) : (
            <div className="grid gap-1.5">
              <Label>Invoice</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger><SelectValue placeholder={invoices.length ? 'Choose an invoice' : 'No invoices yet'} /></SelectTrigger>
                <SelectContent>
                  {invoices.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {invoiceLabel(i)}{i.invoiceNumber ? ` · ${formatDate(i.invoiceDate)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => setCreating(true)}>
                <Plus /> New invoice
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" disabled={!chosen} loading={link.isPending} onClick={() => chosen && apply(chosen)}>Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <InvoiceDialog
        open={open && creating}
        onOpenChange={(o) => !o && setCreating(false)}
        onSaved={(inv) => {
          setCreating(false);
          void apply(inv);
        }}
      />
    </>
  );
}

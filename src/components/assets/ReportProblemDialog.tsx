import * as React from 'react';
import type { Asset, RepairUrgency } from '@/types/asset';
import { useCreateRepairRequest } from '@/hooks/useCollab';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Segmented } from '@/components/app/controls';

const IT_EMAIL = 'tech@kotu.co.in';
const URGENCY: { value: RepairUrgency; label: string; hint: string }[] = [
  { value: 'low', label: 'Can wait', hint: 'Minor — still usable' },
  { value: 'normal', label: 'Soon', hint: 'Getting in the way of work' },
  { value: 'high', label: 'Urgent', hint: 'Can’t work without it' },
];

/** An employee reports a problem with an asset they hold; IT sees it in Maintenance → Requests and by email. */
export function ReportProblemDialog({ asset, open, onOpenChange }: { asset: Asset | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const create = useCreateRepairRequest();
  const [issue, setIssue] = React.useState('');
  const [urgency, setUrgency] = React.useState<RepairUrgency>('normal');

  React.useEffect(() => {
    if (open) {
      setIssue('');
      setUrgency('normal');
    }
  }, [open]);

  if (!asset) return null;
  const tooShort = issue.trim().length < 3;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tooShort) return;
    try {
      await create.mutateAsync({ assetId: asset.id, issue, urgency });
      toast({ title: 'Problem reported', description: `IT has been told about ${asset.assetTag}. You’ll see updates on My assets.` });
      onOpenChange(false);
    } catch (err) {
      const missing = err instanceof Error && /repair_requests/.test(err.message);
      if (missing) {
        // Requests not enabled on this database yet: fall back to email.
        window.location.href = `mailto:${IT_EMAIL}?subject=${encodeURIComponent(`Problem with ${asset.assetTag} (${asset.name})`)}&body=${encodeURIComponent(`${issue}\n\nAsset: ${asset.name}\nTag: ${asset.assetTag}\nSerial: ${asset.serialNumber || '—'}`)}`;
        onOpenChange(false);
        return;
      }
      toast({ title: 'Couldn’t send the report', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
            <DialogDescription>
              {asset.name} · <span className="font-mono">{asset.assetTag}</span>. IT will log a repair and update you here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="rp-issue">What’s wrong?</Label>
            <Textarea
              id="rp-issue"
              rows={4}
              autoFocus
              maxLength={2000}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="e.g. Battery drains in an hour; screen flickers when the lid moves"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>How urgent?</Label>
            <Segmented<RepairUrgency> className="flex w-full" value={urgency} onChange={setUrgency} options={URGENCY.map((u) => ({ value: u.value, label: u.label }))} />
            <p className="text-xs text-muted-foreground">{URGENCY.find((u) => u.value === urgency)?.hint}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={tooShort} loading={create.isPending}>Send to IT</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

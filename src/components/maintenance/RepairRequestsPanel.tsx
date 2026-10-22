import * as React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Inbox, Wrench, XCircle } from 'lucide-react';
import type { RepairRequest, RepairRequestStatus } from '@/types/asset';
import { useAssets } from '@/hooks/useSupabaseData';
import { useAccess, useRepairRequests, useUpdateRepairRequest } from '@/hooks/useCollab';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Segmented } from '@/components/app/controls';
import { AssetThumb, EmptyState, PersonAvatar, Pill } from '@/components/app/primitives';
import { useAssetActions } from '@/components/assets/useAssetActions';
import { timeAgo } from '@/lib/assetMeta';

type Filter = 'active' | 'closed' | 'all';
const STATUS: Record<RepairRequestStatus, { label: string; tone: 'warning' | 'info' | 'success' | 'quiet' }> = {
  open: { label: 'New', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
  declined: { label: 'Declined', tone: 'quiet' },
};
const URGENCY = { high: { label: 'Urgent', tone: 'destructive' as const }, normal: { label: 'Soon', tone: 'quiet' as const }, low: { label: 'Can wait', tone: 'quiet' as const } };

/** Problems employees reported from My assets. */
export function RepairRequestsPanel() {
  const { toast } = useToast();
  const { can } = useAccess();
  const { data: requests = [], isLoading, error } = useRepairRequests();
  const { data: assets = [] } = useAssets();
  const update = useUpdateRepairRequest();
  const { open: act, dialogs } = useAssetActions();
  const [filter, setFilter] = React.useState<Filter>('active');
  const [closing, setClosing] = React.useState<{ req: RepairRequest; status: 'resolved' | 'declined' } | null>(null);
  const [note, setNote] = React.useState('');
  const canManage = can('maintenance.manage');

  if (error) return <EmptyState icon={Inbox} title="Requests aren’t enabled yet" description="Apply migration 0015_page_access_repair_requests.sql in the Supabase SQL editor, then reload." className="py-12" />;
  if (isLoading) return <div className="h-40 animate-pulse bg-muted/50" />;

  const shown = requests.filter((r) => (filter === 'all' ? true : filter === 'active' ? r.status === 'open' || r.status === 'in_progress' : r.status === 'resolved' || r.status === 'declined'));
  const assetOf = (id: string) => assets.find((a) => a.id === id);

  const setStatus = async (r: RepairRequest, status: RepairRequestStatus, itNote?: string) => {
    try {
      await update.mutateAsync({ id: r.id, status, itNote });
      toast({ title: status === 'in_progress' ? 'Marked in progress' : status === 'resolved' ? 'Request resolved' : status === 'declined' ? 'Request declined' : 'Request reopened', description: `${r.assetTag} · ${r.reporterName || r.reporterEmail}` });
    } catch (e) {
      toast({ title: 'Couldn’t update the request', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };
  const startRepair = async (r: RepairRequest) => {
    await setStatus(r, 'in_progress');
    const a = assetOf(r.assetId);
    if (a && a.status !== 'repair') act('repair', a);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <Segmented<Filter> size="sm" value={filter} onChange={setFilter} options={[{ value: 'active', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
        <p className="flex-1 text-[13px] text-muted-foreground">Problems employees report from My assets. They see the status and your note.</p>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={Inbox} title={filter === 'active' ? 'No open requests' : 'Nothing here'} description="When someone reports a problem with their device, it shows up here." className="py-12" />
      ) : (
        <ul className="divide-y">
          {shown.map((r) => {
            const a = assetOf(r.assetId);
            const active = r.status === 'open' || r.status === 'in_progress';
            return (
              <li key={r.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-start">
                <div className="flex min-w-0 flex-1 gap-3">
                  <AssetThumb category={a?.category} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/assets/${r.assetId}`} className="font-medium hover:underline">{r.assetName}</Link>
                      <span className="font-mono text-xs text-muted-foreground">{r.assetTag}</span>
                      <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                      {r.urgency !== 'normal' && <Pill tone={URGENCY[r.urgency].tone} dot={false}>{URGENCY[r.urgency].label}</Pill>}
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{r.issue}</p>
                    {r.itNote && <p className="text-[13px] text-muted-foreground"><span className="font-medium text-foreground">Note:</span> {r.itNote}</p>}
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PersonAvatar name={r.reporterName || r.reporterEmail || '?'} size="xs" /> {r.reporterName || r.reporterEmail} · {timeAgo(r.createdAt)}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {r.status === 'open' && <Button size="sm" onClick={() => startRepair(r)}><Wrench /> Start repair</Button>}
                    {active && <Button size="sm" variant="secondary" onClick={() => { setNote(r.itNote || ''); setClosing({ req: r, status: 'resolved' }); }}><CheckCircle2 /> Resolve</Button>}
                    {active && <Button size="sm" variant="ghost" onClick={() => { setNote(r.itNote || ''); setClosing({ req: r, status: 'declined' }); }}><XCircle /> Decline</Button>}
                    {!active && <Button size="sm" variant="ghost" onClick={() => setStatus(r, 'open')}>Reopen</Button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!closing} onOpenChange={(o) => !o && setClosing(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{closing?.status === 'resolved' ? 'Resolve request' : 'Decline request'}</DialogTitle>
            <DialogDescription>{closing?.req.assetName} · {closing?.req.reporterName}. They’ll see your note on My assets.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="rr-note">Note for the employee {closing?.status === 'resolved' ? '(optional)' : ''}</Label>
            <Textarea id="rr-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={closing?.status === 'resolved' ? 'e.g. Battery replaced under AMC' : 'e.g. Not a hardware fault — reinstalled the driver'} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setClosing(null)}>Cancel</Button>
            <Button
              loading={update.isPending}
              onClick={async () => {
                if (!closing) return;
                await setStatus(closing.req, closing.status, note);
                setClosing(null);
              }}
            >
              {closing?.status === 'resolved' ? 'Resolve' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialogs}
    </>
  );
}

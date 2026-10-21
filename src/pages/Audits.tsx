import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, ClipboardCheck, MapPin, Plus, ScanLine, XCircle } from 'lucide-react';
import { useAssets, useLocations } from '@/hooks/useSupabaseData';
import { useAccess, useAuditDetail, useAudits, useStartAudit } from '@/hooks/useCollab';
import { useToast } from '@/hooks/use-toast';
import type { Audit } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState, PageHeader, PageLoader, Pill, ProgressBar } from '@/components/app/primitives';
import { displayLocation, formatDate } from '@/lib/assetMeta';

function ActiveAuditCard({ audit }: { audit: Audit }) {
  const { data } = useAuditDetail(audit.id);
  const scans = data?.scans || [];
  const found = scans.filter((s) => s.result === 'found').length;
  const misplaced = scans.filter((s) => s.result === 'misplaced').length;
  const unexpected = scans.filter((s) => s.result === 'unexpected').length;
  const missing = Math.max(0, audit.expectedCount - found);
  const pct = audit.expectedCount ? found / audit.expectedCount : 0;
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold">{audit.name}</h2>
            <Pill tone="info">In progress</Pill>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Started {formatDate(audit.startedAt)}{audit.startedByName ? ` by ${audit.startedByName}` : ''}{audit.dueDate ? ` · due ${formatDate(audit.dueDate)}` : ''}
          </p>
        </div>
        <Button asChild>
          <Link to={`/audits/${audit.id}`}><ScanLine /> Continue scanning</Link>
        </Button>
      </div>
      <div className="space-y-2">
        <div className="flex text-sm"><span className="flex-1 font-medium">{found} of {audit.expectedCount} expected assets found</span><span className="font-semibold tabular">{Math.round(pct * 100)}%</span></div>
        <ProgressBar value={pct} tone="primary" className="h-2.5" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[
          { cls: 'bg-success-soft text-success-strong', icon: CheckCircle2, n: found, l: 'Found where expected' },
          { cls: 'bg-warning-soft text-warning-strong', icon: MapPin, n: misplaced, l: 'Found at wrong location' },
          { cls: 'bg-special-soft text-special-strong', icon: AlertTriangle, n: unexpected, l: 'Not in register' },
          { cls: 'bg-destructive-soft text-destructive-strong', icon: XCircle, n: missing, l: 'Not yet scanned' },
        ].map((s) => (
          <div key={s.l} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ${s.cls}`}>
            <s.icon className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xl font-semibold tabular">{s.n}</p>
              <p className="text-xs">{s.l}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Audits() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: audits = [], isLoading, error } = useAudits();
  const { data: locations = [] } = useLocations();
  const { data: assets = [] } = useAssets();
  const { access, can } = useAccess();
  const start = useStartAudit();
  const [open, setOpen] = useState(false);
  const [locationId, setLocationId] = useState('');
  const [name, setName] = useState('');
  const [due, setDue] = useState('');

  const loc = locations.find((l) => l.id === locationId);
  const expected = useMemo(
    () => (loc ? assets.filter((a) => (a.locationId === loc.id || a.location === loc.name) && (a.status === 'available' || a.status === 'assigned')) : []),
    [assets, loc],
  );

  if (isLoading) return <PageLoader label="Loading audits" />;
  if (error)
    return (
      <div className="space-y-5">
        <PageHeader title="Audits" />
        <div className="rounded-xl border bg-card"><EmptyState icon={ClipboardCheck} title="Audits aren’t enabled yet" description="Apply migration 0011_audits.sql in the Supabase SQL editor, then reload." /></div>
      </div>
    );

  const active = audits.filter((a) => a.status === 'in_progress');
  const past = audits.filter((a) => a.status === 'closed');
  const quarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`;

  const begin = async () => {
    if (!loc) return;
    try {
      const audit = await start.mutateAsync({
        name: name.trim() || `${quarter} stock-take — ${displayLocation(loc.name)}`,
        locationId: loc.id,
        locationName: displayLocation(loc.name),
        dueDate: due || undefined,
        startedByName: access?.name || undefined,
        expected: expected.map((a) => ({ id: a.id, assetTag: a.assetTag, name: a.name, serialNumber: a.serialNumber })),
      });
      setOpen(false);
      navigate(`/audits/${audit.id}`);
    } catch (e) {
      toast({ title: 'Couldn’t start audit', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audits"
        description="Physical stock-takes: scan every label, find what’s missing or misplaced"
        actions={can('audits.run') && <Button onClick={() => setOpen(true)}><Plus /> Start audit</Button>}
      />

      {active.length === 0 && past.length === 0 && (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={ClipboardCheck} title="No audits yet" description="Start one per location. Everyone scanning sees progress live — on a phone, use the camera; at a desk, a USB scanner." action={can('audits.run') && <Button onClick={() => setOpen(true)}><Plus /> Start audit</Button>} />
        </div>
      )}

      {active.map((a) => <ActiveAuditCard key={a.id} audit={a} />)}

      {past.length > 0 && (
        <section className="overflow-hidden rounded-xl border bg-card">
          <h2 className="px-5 pb-2 pt-4 text-[15px] font-semibold">Past audits</h2>
          <ul className="divide-y">
            {past.map((a) => (
              <li key={a.id}>
                <Link to={`/audits/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-subtle">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.name}</span>
                    <span className="block text-xs text-muted-foreground">{a.locationName} · closed {formatDate(a.closedAt)} · {a.expectedCount} expected</span>
                  </span>
                  <span className="text-sm font-semibold tabular">{a.accuracy == null ? '—' : `${a.accuracy}%`}</span>
                  <Pill tone={(a.accuracy ?? 0) >= 98 ? 'success' : 'warning'}>{(a.accuracy ?? 0) >= 98 ? 'Closed' : 'Gaps found'}</Pill>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start an audit</DialogTitle>
            <DialogDescription>We’ll snapshot the assets expected at this location right now.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue placeholder="Choose location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{displayLocation(l.name)}</SelectItem>)}
                </SelectContent>
              </Select>
              {loc && <p className="text-xs text-muted-foreground">{expected.length} assets expected (in stock or assigned here)</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="aname">Name</Label>
              <Input id="aname" value={name} onChange={(e) => setName(e.target.value)} placeholder={loc ? `${quarter} stock-take — ${displayLocation(loc.name)}` : `${quarter} stock-take`} />
            </div>
            <div className="grid gap-1.5">
              <Label>Due date (optional)</Label>
              <DatePicker value={due} onChange={setDue} className="h-[38px] w-full" placeholder={format(new Date(Date.now() + 7 * 864e5), 'd MMM yyyy')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!loc} loading={start.isPending} onClick={begin}><ScanLine /> Start scanning</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

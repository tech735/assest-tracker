import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, Ban, Briefcase, CalendarDays, Copy, FileSignature, LogOut, Mail, MapPin, Package, Pencil, Plus, Printer, Send, Users } from 'lucide-react';
import { useAssets, useAssignments, useEmployees, useSettings } from '@/hooks/useSupabaseData';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
import { KpiCard, ViewTabs } from '@/components/app/controls';
import { AssetThumb, EmptyState, KeyValue, PageHeader, PageLoader, PersonAvatar, Pill, SectionCard } from '@/components/app/primitives';
import { useAssetActions } from '@/components/assets/useAssetActions';
import { EditEmployeeDialog } from '@/components/people/EditEmployeeDialog';
import { OffboardEmployeeDialog } from '@/components/people/OffboardEmployeeDialog';
import { BundleAssignDialog } from '@/components/people/BundleAssignDialog';
import { useAccess, useCreateHandover, useHandoverDocuments, useVoidHandover } from '@/hooks/useCollab';
import { requestHandoverSignature } from '@/components/assets/CheckOutDialog';
import { docNumber } from '@/components/handover/HandoverDocumentView';
import { signingLink } from '@/services/collabService';
import { daysUntil, displayLocation, EMPLOYEE_STATUS_META, formatDate, formatMoney, timeAgo, titleCase } from '@/lib/assetMeta';

type Tab = 'assets' | 'history' | 'documents';

export default function PersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: employees = [], isLoading } = useEmployees();
  const { data: assets = [] } = useAssets();
  const { data: assignments = [] } = useAssignments();
  const { data: settings } = useSettings();
  const { open: act, dialogs } = useAssetActions();
  const { access, can } = useAccess();
  const createDoc = useCreateHandover();
  const voidDoc = useVoidHandover();
  const { data: docs = [], error: docsError } = useHandoverDocuments({ employeeId: id }, !!id);
  const [requesting, setRequesting] = useState(false);
  // Kept in the URL so coming back from a form (or a refresh) lands on the same tab.
  const [params, setParams] = useSearchParams();
  const tab = (['assets', 'history', 'documents'].includes(params.get('tab') || '') ? params.get('tab') : 'assets') as Tab;
  const setTab = (t: Tab) => setParams(t === 'assets' ? {} : { tab: t }, { replace: true });
  const [editing, setEditing] = useState(false);
  const [offboarding, setOffboarding] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [sending, setSending] = useState(false);

  const person = employees.find((e) => e.id === id);
  const held = useMemo(() => assets.filter((a) => a.status === 'assigned' && a.assignedToId === id), [assets, id]);
  const history = useMemo(() => assignments.filter((a) => a.employeeId === id).sort((a, b) => (b.assignedDate || '').localeCompare(a.assignedDate || '')), [assignments, id]);

  if (isLoading) return <PageLoader label="Loading profile" />;
  if (!person) return <EmptyState icon={Users} title="Person not found" action={<Button onClick={() => navigate('/people')}>Back to people</Button>} />;

  const value = held.reduce((s, a) => s + (a.purchaseCost || 0), 0);
  const avgDays = held.length
    ? Math.round(
        held.reduce((s, a) => {
          const since = history.find((h) => h.assetId === a.id && h.eventType === 'assign')?.assignedDate;
          return s + (since ? -(daysUntil(since) ?? 0) : 0);
        }, 0) / held.length,
      )
    : 0;
  const sinceFor = (assetId: string) => history.find((h) => h.assetId === assetId && h.eventType === 'assign')?.assignedDate;
  const meta = EMPLOYEE_STATUS_META[person.status] ?? EMPLOYEE_STATUS_META.active;
  const offboarded = person.status === 'offboarded';

  const requestSignature = async () => {
    setRequesting(true);
    try {
      await requestHandoverSignature({ employee: person, assets: held, handedOverBy: access?.name || undefined, createdByName: access?.name || undefined, createDoc: createDoc.mutateAsync, toast });
      setTab('documents');
    } catch (e) {
      toast({ title: 'Couldn’t create the form', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setRequesting(false);
    }
  };
  const pendingDocs = docs.filter((d) => d.status === 'pending').length;

  const sendSummary = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-asset-email', { body: { employeeId: person.id } });
      if (error) {
        let message = error.message;
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) message = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      toast({ title: 'Asset summary sent', description: `Emailed to ${person.email}` });
      setConfirmEmail(false);
    } catch (e) {
      toast({ title: 'Couldn’t send email', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'People', to: '/people' }, { label: person.name }]}
        title={
          <span className="flex items-center gap-4">
            <PersonAvatar name={person.name} src={person.avatarUrl} size="xl" className="hidden sm:inline-flex" />
            <PersonAvatar name={person.name} src={person.avatarUrl} size="lg" className="sm:hidden" />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2.5">
                <span className="truncate">{person.name}</span>
                <Pill tone={meta.tone}>{meta.label}</Pill>
              </span>
              <span className="mt-1 block truncate text-[13px] font-normal tracking-normal text-muted-foreground">
                {[person.position, person.department, displayLocation(person.location)].filter(Boolean).join(' · ')}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {can('assets.checkout') && held.length > 0 && (
              <Button variant="secondary" loading={requesting} onClick={requestSignature}>
                <FileSignature /> <span className="hidden sm:inline">Request signature</span>
              </Button>
            )}
            <Button variant="secondary" onClick={() => setConfirmEmail(true)} disabled={!held.length}>
              <Send /> <span className="hidden sm:inline">Email summary</span>
            </Button>
            <Button variant="secondary" asChild>
              <Link to={`/print-handover/employee/${person.id}`}>
                <Printer /> <span className="hidden sm:inline">Handover form</span>
              </Link>
            </Button>
            {!offboarded && can('assets.checkout') && (
              <Button onClick={() => setAssigning(true)}>
                <Plus /> Assign assets
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard compact label="Assets held" value={held.length} />
        {can('costs.view') ? <KpiCard compact label="Value held" value={formatMoney(value, settings?.currency)} /> : <KpiCard compact label="Pending forms" value={pendingDocs} />}
        <KpiCard compact label="Avg. days held" value={avgDays} />
        <KpiCard compact label="Handovers" value={history.filter((h) => h.eventType === 'assign').length} />
      </div>

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[{ value: 'assets', label: 'Assets', count: held.length }, { value: 'history', label: 'History', count: history.length }, { value: 'documents', label: 'Documents', count: pendingDocs ? `${pendingDocs} to sign` : docs.length }]} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {tab === 'assets' ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              {held.length === 0 ? (
                <EmptyState icon={Package} title="No assets assigned" description={offboarded ? 'All assets have been returned.' : 'Assign a laptop, monitor or phone to get started.'} action={!offboarded && <Button onClick={() => setAssigning(true)}><Plus /> Assign assets</Button>} />
              ) : (
                <ul className="divide-y">
                  {held.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-subtle">
                      <AssetThumb category={a.category} />
                      <Link to={`/assets/${a.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">{a.assetTag}</span> · since {formatDate(sinceFor(a.id))} · {titleCase(a.condition)}
                        </p>
                      </Link>
                      {can('assets.checkout') && (
                        <Button size="sm" variant="ghost" onClick={() => act('return', a)}>
                          <ArrowLeftRight /> <span className="hidden sm:inline">Check in</span>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : tab === 'documents' ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              {docsError ? (
                <EmptyState icon={FileSignature} title="E-signed forms aren’t enabled yet" description="Apply migration 0012_handover_esign.sql in Supabase." />
              ) : docs.length === 0 ? (
                <EmptyState icon={FileSignature} title="No handover forms yet" description="Forms are created when you check assets out with e-signature on, or with “Request signature”." />
              ) : (
                <ul className="divide-y">
                  {docs.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                      <FileSignature className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <Link to={`/sign/${d.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{docNumber(d)} · {d.kind === 'return' ? 'Return' : 'Handover'} · {d.items.length} item{d.items.length === 1 ? '' : 's'}</p>
                        <p className="truncate text-xs text-muted-foreground">Issued {formatDate(d.createdAt)}{d.signedAt ? ` · signed ${formatDate(d.signedAt)} by ${d.signerName}` : ''}</p>
                      </Link>
                      {d.status === 'signed' ? <Pill tone="success">Signed</Pill> : d.status === 'void' ? <Pill tone="quiet">Void</Pill> : <Pill tone="warning">Awaiting signature</Pill>}
                      <Button size="icon-sm" variant="ghost" asChild aria-label="Print"><Link to={`/print-handover/doc/${d.id}`}><Printer /></Link></Button>
                      {d.status === 'pending' && (
                        <Button size="icon-sm" variant="ghost" aria-label="Copy signing link" onClick={() => { navigator.clipboard.writeText(signingLink(d.id)); toast({ title: 'Signing link copied' }); }}>
                          <Copy />
                        </Button>
                      )}
                      {d.status === 'pending' && can('assets.checkout') && (
                        <Button size="icon-sm" variant="ghost" aria-label="Void form" onClick={() => voidDoc.mutate(d.id)}>
                          <Ban />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <SectionCard>
              {history.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No handovers yet.</p>
              ) : (
                <ul className="space-y-3.5">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${h.eventType === 'assign' ? 'bg-info-soft text-info-strong' : 'bg-quiet-soft text-quiet-strong'}`}>
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          {h.eventType === 'assign' ? 'Received' : h.eventType === 'return' ? 'Returned' : titleCase(h.eventType.replace('_', ' '))}{' '}
                          <Link to={`/assets/${h.assetId}`} className="font-medium hover:underline">{h.assetName}</Link>
                        </p>
                        <p className="text-xs text-muted-foreground">{h.assetTag} · {formatDate(h.assignedDate)} · {timeAgo(h.assignedDate)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}
        </div>

        <aside className="space-y-4">
          <SectionCard title="Details" action={can('people.manage') && <button onClick={() => setEditing(true)} className="text-[13px] font-medium text-link hover:underline"><Pencil className="mr-1 inline h-3.5 w-3.5" />Edit</button>}>
            <div className="space-y-3">
              <KeyValue icon={Mail} label="Email">{person.email}</KeyValue>
              <KeyValue icon={Briefcase} label="Position">{person.position || '—'}</KeyValue>
              <KeyValue icon={Users} label="Department">{person.department}</KeyValue>
              <KeyValue icon={MapPin} label="Base location">{displayLocation(person.location)}</KeyValue>
              <KeyValue icon={CalendarDays} label="Joined">{formatDate(person.joinDate)}</KeyValue>
              {person.exitDate && <KeyValue icon={LogOut} label="Exit date">{formatDate(person.exitDate)}</KeyValue>}
            </div>
          </SectionCard>

          <SectionCard title="Offboarding">
            {offboarded ? (
              held.length ? (
                <div className="space-y-3">
                  <p className="text-[13px] text-warning-strong">{held.length} asset{held.length > 1 ? 's' : ''} still to collect.</p>
                  <ul className="space-y-2">
                    {held.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-[13px]">
                        <span className="h-4 w-4 rounded border border-border-strong" />
                        <span className="flex-1 truncate">Collect {a.name} ({a.assetTag})</span>
                        {can('assets.checkout') && <button onClick={() => act('return', a)} className="font-medium text-link hover:underline">Check in</button>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[13px] text-success-strong">All assets returned.</p>
              )
            ) : !can('people.manage') ? (
              <p className="text-[13px] text-muted-foreground">Active employee.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] text-muted-foreground">When {person.name.split(' ')[0]} leaves, start offboarding to record the exit date and track the return of all {held.length} assets.</p>
                <Button variant="secondary" className="w-full" onClick={() => setOffboarding(true)}>
                  <LogOut /> Start offboarding
                </Button>
              </div>
            )}
          </SectionCard>
        </aside>
      </div>

      {dialogs}
      {editing && <EditEmployeeDialog employee={person} open onOpenChange={setEditing} />}
      {offboarding && <OffboardEmployeeDialog employee={person} open onOpenChange={setOffboarding} />}
      {assigning && <BundleAssignDialog employee={person} open onOpenChange={setAssigning} />}
      <AlertDialog open={confirmEmail} onOpenChange={setConfirmEmail}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Email asset summary?</AlertDialogTitle>
            <AlertDialogDescription>
              Sends <strong>{person.email}</strong> a list of the {held.length} assets currently assigned to them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); sendSummary(); }} disabled={sending}>
              {sending ? 'Sending…' : 'Send email'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

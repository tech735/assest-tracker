import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Send } from 'lucide-react';
import { useAssets, useEmployees, useLocations, useSettings } from '@/hooks/useSupabaseData';
import { useAccess, useCreateHandover, useHandoverDocument } from '@/hooks/useCollab';
import { useToast } from '@/hooks/use-toast';
import type { HandoverDocument } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { HandoverDocumentView } from '@/components/handover/HandoverDocumentView';
import { requestHandoverSignature } from '@/components/assets/CheckOutDialog';
import { displayLocation } from '@/lib/assetMeta';

/**
 * Printable A4 handover form.
 *  /print-handover/doc/:id       — an issued (possibly signed) document
 *  /print-handover/employee/:id  — draft from what the person currently holds (can be sent for e-signature)
 *  /print-handover/location/:id  — draft listing every asset at a location
 */
export default function PrintHandover() {
  const { type, id = '' } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const { data: employees = [] } = useEmployees();
  const { data: locations = [] } = useLocations();
  const { data: assets = [], isLoading } = useAssets();
  const { access, can } = useAccess();
  const createDoc = useCreateHandover();
  const { data: issued, isLoading: docLoading } = useHandoverDocument(type === 'doc' ? id : '');
  const [sending, setSending] = useState(false);

  const draft: HandoverDocument | null = useMemo(() => {
    if (type === 'doc') return null;
    const now = new Date().toISOString();
    if (type === 'employee') {
      const e = employees.find((x) => x.id === id);
      if (!e) return null;
      const held = assets.filter((a) => a.status === 'assigned' && a.assignedToId === id);
      return {
        id: 'draft', docNo: 0, kind: 'handover', employeeId: e.id, employeeName: e.name, employeeEmail: e.email, locationName: displayLocation(e.location),
        items: held.map((a) => ({ assetId: a.id, tag: a.assetTag, name: a.name, serial: a.serialNumber, brand: a.brand, condition: a.condition })),
        handedOverBy: access?.name || undefined, status: 'pending', createdAt: now,
      };
    }
    if (type === 'location') {
      const l = locations.find((x) => x.id === id);
      if (!l) return null;
      const here = assets.filter((a) => a.locationId === id || a.location === l.name);
      return {
        id: 'draft', docNo: 0, kind: 'handover', employeeName: displayLocation(l.name), employeeEmail: '—', locationName: l.address || displayLocation(l.name),
        items: here.map((a) => ({ assetId: a.id, tag: a.assetTag, name: a.name, serial: a.serialNumber, brand: a.brand, condition: a.condition })),
        handedOverBy: access?.name || undefined, status: 'pending', createdAt: now,
      };
    }
    return null;
  }, [type, id, employees, locations, assets, access?.name]);

  const doc = type === 'doc' ? issued : draft;
  const person = type === 'employee' ? employees.find((x) => x.id === id) : undefined;

  const send = async () => {
    if (!person || !draft) return;
    setSending(true);
    try {
      const created = await requestHandoverSignature({
        employee: person,
        assets: assets.filter((a) => a.status === 'assigned' && a.assignedToId === person.id),
        handedOverBy: access?.name || undefined,
        createdByName: access?.name || undefined,
        createDoc: createDoc.mutateAsync,
        toast,
      });
      navigate(`/print-handover/doc/${created.id}`, { replace: true });
    } catch (e) {
      toast({ title: 'Couldn’t create the form', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (isLoading || docLoading) return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading form…</div>;
  if (!doc) return <div className="flex h-screen items-center justify-center text-sm text-destructive-strong">Form not found</div>;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-card/95 px-4 py-3 backdrop-blur print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft /> Back
        </Button>
        <p className="flex-1 truncate text-sm text-muted-foreground">{type === 'doc' ? 'Issued form' : 'Draft — not yet issued'}</p>
        {person && can('assets.checkout') && draft && draft.items.length > 0 && (
          <Button variant="secondary" loading={sending} onClick={send}>
            <Send /> Send for e-signature
          </Button>
        )}
        <Button onClick={() => window.print()}>
          <Printer /> Print / Save PDF
        </Button>
      </div>
      <div className="py-6 print:py-0">
        <div className="mx-auto max-w-[794px] overflow-hidden rounded-2xl border shadow-card print:rounded-none print:border-0 print:shadow-none">
          <HandoverDocumentView doc={doc} orgName={settings?.orgName && settings.orgName !== 'Asset Compass' ? settings.orgName : undefined} />
        </div>
      </div>
      <style>{`@page { size: A4; margin: 14mm; }`}</style>
    </div>
  );
}

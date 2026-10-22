import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileX, Printer } from 'lucide-react';
import { useAccess, useHandoverDocument, useSignHandover } from '@/hooks/useCollab';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, PageHeader, PageLoader, Pill } from '@/components/app/primitives';
import { docNumber, HandoverDocumentView } from '@/components/handover/HandoverDocumentView';
import { SignaturePad } from '@/components/handover/SignaturePad';
import { formatDate } from '@/lib/assetMeta';

export default function SignHandover() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { access } = useAccess();
  const { data: doc, isLoading, error } = useHandoverDocument(id);
  const sign = useSignHandover(id);
  const [name, setName] = useState('');
  const [signature, setSignature] = useState('');
  const [agree, setAgree] = useState(false);

  if (isLoading) return <PageLoader label="Loading document" />;
  if (error || !doc)
    return (
      <EmptyState
        icon={FileX}
        title="Document not available"
        description="Either the link is wrong, or this form belongs to someone else. Sign in with the KOTU account the form was sent to."
        action={<Button asChild variant="secondary"><Link to="/me">Go to My assets</Link></Button>}
      />
    );

  const isSigner = !!access?.email && access.email.toLowerCase() === doc.employeeEmail.toLowerCase();
  const canSign = doc.status === 'pending' && isSigner;

  const submit = async () => {
    try {
      await sign.mutateAsync({ name: name.trim(), signature });
      toast({ title: 'Signed — thank you', description: 'A copy is saved with your profile.' });
    } catch (e) {
      toast({ title: 'Couldn’t save your signature', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-[860px] space-y-5">
      <PageHeader
        breadcrumb={
          !isSigner && doc.employeeId
            ? [{ label: 'People', to: '/people' }, { label: doc.employeeName, to: `/people/${doc.employeeId}?tab=documents` }, { label: docNumber(doc) }]
            : [{ label: 'My assets', to: '/me' }, { label: docNumber(doc) }]
        }
        title={doc.kind === 'return' ? 'Asset return form' : 'Asset handover form'}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {doc.status === 'signed' ? <Pill tone="success">Signed {formatDate(doc.signedAt)}</Pill> : doc.status === 'void' ? <Pill tone="quiet">Void</Pill> : <Pill tone="warning">Awaiting signature</Pill>}
            <span>{doc.items.length} item{doc.items.length === 1 ? '' : 's'} · issued {formatDate(doc.createdAt)}</span>
          </span>
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(!isSigner && doc.employeeId ? `/people/${doc.employeeId}?tab=documents` : '/me'))}>
              <ArrowLeft /> Back
            </Button>
            <Button variant="secondary" asChild>
              <Link to={`/print-handover/doc/${doc.id}`}><Printer /> Print / PDF</Link>
            </Button>
          </>
        }
      />

      <div className="overflow-hidden rounded-2xl border shadow-card">
        <HandoverDocumentView doc={doc} />
      </div>

      {canSign && (
        <section className="space-y-4 rounded-2xl border bg-card p-5 md:p-6">
          <div>
            <h2 className="text-[15px] font-semibold">Sign this form</h2>
            <p className="text-[13px] text-muted-foreground">Check the items above, then type your name and sign.</p>
          </div>
          <div className="grid gap-1.5 sm:max-w-sm">
            <Label htmlFor="signer">Full name</Label>
            <Input id="signer" value={name} onChange={(e) => setName(e.target.value)} placeholder={doc.employeeName} autoComplete="name" />
          </div>
          <SignaturePad onChange={setSignature} />
          <label className="flex items-start gap-2.5 text-[13px]">
            <Checkbox checked={agree} onCheckedChange={(c) => setAgree(c === true)} className="mt-0.5" />
            I confirm I have received the assets listed above in the stated condition and agree to the terms on this form.
          </label>
          <Button className="w-full sm:w-auto" disabled={!name.trim() || !signature || !agree} loading={sign.isPending} onClick={submit}>
            <CheckCircle2 /> Sign form
          </Button>
        </section>
      )}
      {doc.status === 'pending' && !isSigner && (
        <p className="rounded-xl bg-info-soft px-4 py-3 text-[13px] text-info-strong">
          Waiting for {doc.employeeName} ({doc.employeeEmail}) to sign. Share this page’s link with them — they sign in with their own KOTU account.
        </p>
      )}
    </div>
  );
}

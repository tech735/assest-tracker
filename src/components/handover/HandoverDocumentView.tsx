import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2 } from 'lucide-react';
import type { HandoverDocument } from '@/types/asset';
import { formatDate } from '@/lib/assetMeta';
import { cn } from '@/lib/utils';
import kotuLogo from '@/assets/kotu-logo.png';

export const docNumber = (d: Pick<HandoverDocument, 'docNo' | 'createdAt' | 'kind'>) =>
  `${d.kind === 'return' ? 'RT' : 'HO'}-${new Date(d.createdAt).getFullYear()}-${String(d.docNo).padStart(4, '0')}`;

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** A4 handover form (🖥️ 18 in Figma). Used for printing, signing and previews. */
export function HandoverDocumentView({
  doc,
  orgName = 'School Style Supplies Pvt. Ltd. (KOTU)',
  className,
}: {
  doc: HandoverDocument;
  orgName?: string;
  className?: string;
}) {
  const verifyUrl = `${window.location.origin}/sign/${doc.id}`;
  return (
    <article className={cn('mx-auto flex w-full max-w-[794px] flex-col gap-6 bg-white p-6 text-[#12151B] sm:p-12 print:max-w-none print:p-0', className)}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <img src={kotuLogo} alt="KOTU" width={44} height={44} className="h-11 w-11 shrink-0 rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold leading-tight sm:text-2xl">{doc.kind === 'return' ? 'Asset Return Form' : 'Asset Handover Form'}</h1>
          <p className="text-[13px] text-[#6B7385]">IT &amp; Tech · {orgName}</p>
        </div>
        <div className="w-full sm:w-auto sm:text-right">
          <p className="font-mono text-[13px] font-medium">{docNumber(doc)}</p>
          <p className="text-xs text-[#6B7385]">Issued {formatDate(doc.createdAt)}</p>
          {doc.status === 'void' && <p className="mt-1 text-xs font-semibold uppercase text-[#B42318]">Void</p>}
        </div>
      </header>

      <dl className="grid overflow-hidden rounded-lg border border-[#E2E5EB] sm:grid-cols-2">
        {[
          [doc.kind === 'return' ? 'Returned by' : 'Handed over to', doc.employeeName],
          ['Email', doc.employeeEmail],
          ['Working location', doc.locationName || '—'],
          [doc.kind === 'return' ? 'Received by' : 'Handed over by', doc.handedOverBy || doc.createdByName || 'IT team'],
          ['Date', formatDate(doc.createdAt)],
          ['Items', String(doc.items.length)],
        ].map(([k, v]) => (
          <div key={k} className="border-b border-[#E2E5EB] px-3.5 py-2.5 sm:[&:nth-last-child(-n+2)]:border-b-0">
            <dt className="text-xs text-[#9AA3B2]">{k}</dt>
            <dd className="truncate text-[13px] font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-2 text-[15px] font-semibold">Assets</h2>
        <div className="overflow-x-auto rounded-lg border border-[#E2E5EB]">
          <table className="w-full text-[13px]">
            <thead className="bg-[#FAFAFB] text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7385]">
              <tr>
                <th className="px-3 py-2">Tag</th>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2">Serial no.</th>
                <th className="px-3 py-2">Condition</th>
                <th className="px-3 py-2">Accessories</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((it) => (
                <tr key={it.assetId || it.tag} className="border-t border-[#E2E5EB]">
                  <td className="px-3 py-2 font-mono">{it.tag}</td>
                  <td className="px-3 py-2">{it.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{it.serial || '—'}</td>
                  <td className="px-3 py-2 capitalize">{it.condition || '—'}</td>
                  <td className="px-3 py-2">{it.accessories || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {doc.notes && <p className="mt-2 text-[13px] text-[#6B7385]">Notes: {doc.notes}</p>}
      </section>

      <p className="text-[13px] leading-relaxed text-[#4B5263]">
        {doc.kind === 'return'
          ? 'I confirm I have returned the assets listed above in the stated condition.'
          : `I acknowledge receipt of the assets listed above in the stated condition. They remain the property of ${orgName}, are to be used for official purposes only, and will be returned on request or on my last working day. Loss or damage must be reported to IT within 24 hours.`}
      </p>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[#E2E5EB] p-4">
          <p className="text-xs text-[#9AA3B2]">{doc.kind === 'return' ? 'Returned by' : 'Received by'} (employee)</p>
          {doc.status === 'signed' && doc.signature ? (
            <>
              <img src={doc.signature} alt={`Signature of ${doc.signerName}`} className="my-1 h-16 max-w-full object-contain" />
              <p className="text-[13px] font-medium">{doc.signerName}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[#067647]">
                <CheckCircle2 className="h-3.5 w-3.5" /> Signed electronically {fmtTime(doc.signedAt)}
              </p>
            </>
          ) : (
            <div className="mt-8 border-t border-dashed border-[#CDD2DB] pt-1.5 text-xs text-[#9AA3B2]">{doc.status === 'void' ? 'Void' : 'Awaiting signature'}</div>
          )}
        </div>
        <div className="rounded-lg border border-[#E2E5EB] p-4">
          <p className="text-xs text-[#9AA3B2]">{doc.kind === 'return' ? 'Received by' : 'Handed over by'} (IT)</p>
          <p className="my-2 text-xl font-medium text-[#1C1AB8]">{doc.handedOverBy || doc.createdByName || 'IT team'}</p>
          <p className="flex items-center gap-1.5 text-xs text-[#067647]">
            <CheckCircle2 className="h-3.5 w-3.5" /> Issued electronically {fmtTime(doc.createdAt)}
          </p>
        </div>
      </section>

      <footer className="flex items-center gap-4 border-t border-[#E2E5EB] pt-4">
        <QRCodeSVG value={verifyUrl} size={64} marginSize={0} />
        <div className="min-w-0">
          <p className="text-[13px] font-medium">Scan to verify this document</p>
          <p className="break-all text-xs text-[#6B7385]">{verifyUrl}</p>
        </div>
      </footer>
    </article>
  );
}

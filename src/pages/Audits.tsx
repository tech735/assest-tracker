import { ClipboardCheck } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/app/primitives';

// Replaced by the full audits module in phase 2 of the redesign.
export default function Audits() {
  return (
    <div className="space-y-5">
      <PageHeader title="Audits" description="Physical stock-takes: scan every label, find what’s missing or misplaced" />
      <div className="rounded-xl border bg-card">
        <EmptyState icon={ClipboardCheck} title="Audits are being set up" description="Scan-based stock-takes arrive with the next part of this update." />
      </div>
    </div>
  );
}

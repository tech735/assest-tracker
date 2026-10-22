import { Link, Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAccess } from '@/hooks/useCollab';
import type { Permission } from '@/services/collabService';
import { Button } from '@/components/ui/button';
import { EmptyState, PageLoader } from '@/components/app/primitives';

export function NoAccess() {
  return (
    <div className="rounded-xl border bg-card">
      <EmptyState
        icon={Lock}
        title="This page isn’t available for your role"
        description="Ask IT (tech@kotu.co.in) if you need access."
        action={<Button asChild><Link to="/me">Go to My assets</Link></Button>}
      />
    </div>
  );
}

/** Shows the page only when the role has its page permission (Settings → Roles & permissions → Pages). */
export function RequirePage({ perm, redirectTo, children }: { perm: Permission; redirectTo?: string; children: React.ReactNode }) {
  const { can, ready } = useAccess();
  if (!ready) return <PageLoader />;
  if (can(perm)) return <>{children}</>;
  return redirectTo ? <Navigate to={redirectTo} replace /> : <NoAccess />;
}

import { Link } from 'react-router-dom';
import { useAccess } from '@/hooks/useCollab';

/** Links to an asset page when the role has the Assets page; otherwise plain text (e.g. viewers on People). */
export function AssetLink({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { can } = useAccess();
  return can('assets.view') ? (
    <Link to={`/assets/${id}`} className={className}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}

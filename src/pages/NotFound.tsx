import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/app/primitives';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border bg-card">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The link may be wrong, or the page has moved."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              <ArrowLeft /> Go back
            </Button>
            <Button asChild>
              <Link to="/me">Go to My assets</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}

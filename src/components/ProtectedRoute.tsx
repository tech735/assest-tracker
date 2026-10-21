import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { takePostLoginRedirect } from '@/lib/sessionUser';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useUser();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        // Remember where they were going (e.g. a /sign/<id> link) so sign-in can return them there.
        if (location.pathname !== '/') sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
        return <Navigate to="/login" replace />;
    }

    // Signed in on the home page (the Site URL fallback) while a deep link is pending, e.g. /sign/<id>.
    if (location.pathname === '/' && sessionStorage.getItem('postLoginRedirect')) {
        const next = takePostLoginRedirect();
        if (next && next !== '/') return <Navigate to={next} replace />;
    }

    return <>{children}</>;
}

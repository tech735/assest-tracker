import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import type { UserRole as DatabaseUserRole } from '@/types/database';
import { Loader2 } from 'lucide-react';

type ProfileRow = {
    id: string;
    full_name: string | null;
    email: string;
    role: DatabaseUserRole;
};

export default function AuthCallback() {
    const navigate = useNavigate();
    const { setUser } = useUser();
    const [error, setError] = useState('');
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const completeSignIn = async () => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session?.user?.email) {
                setError('Google sign-in failed. Please try again.');
                return;
            }

            const authUser = session.user;

            let profile: ProfileRow | null = null;

            const byId = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();
            profile = byId.data as ProfileRow | null;

            if (!profile) {
                // Falls back to an account created before it had a Supabase Auth identity.
                const byEmail = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('email', authUser.email)
                    .maybeSingle();
                profile = byEmail.data as ProfileRow | null;
            }

            if (!profile) {
                setError('No profile is set up for this account yet. Contact your administrator.');
                await supabase.auth.signOut();
                return;
            }

            setUser({
                id: profile.id,
                name: profile.full_name || (authUser.user_metadata?.full_name as string) || 'User',
                email: profile.email,
                role: profile.role,
            });

            navigate('/', { replace: true });
        };

        completeSignIn();
    }, [navigate, setUser]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
            {error ? (
                <>
                    <p className="text-red-600 font-medium text-center max-w-sm px-4">{error}</p>
                    <button
                        onClick={() => navigate('/login', { replace: true })}
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        Back to sign in
                    </button>
                </>
            ) : (
                <>
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm">Signing you in…</p>
                </>
            )}
        </div>
    );
}

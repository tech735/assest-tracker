import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn } from 'lucide-react';
import backgroundImage from '../assets/background-image.png';

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.998 11.998 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A11.998 11.998 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11z" />
        <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
);

// Google is the only sign-in method: it creates a real Supabase session, which RLS requires
// (see supabase/migrations/0006_security_advisor_fixes.sql).
export default function Auth() {
    const [error, setError] = useState('');
    const [googleLoading, setGoogleLoading] = useState(false);

    // Supabase bounces OAuth errors (e.g. domain rejected) back as a URL hash fragment.
    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const errorDescription = params.get('error_description');
        if (errorDescription) {
            setError(errorDescription.replace(/\+/g, ' '));
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, []);

    const handleGoogleSignIn = async () => {
        setError('');
        setGoogleLoading(true);
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    hd: 'kotu.co.in',
                    prompt: 'select_account',
                },
            },
        });
        if (oauthError) {
            setError(oauthError.message);
            setGoogleLoading(false);
        }
        // On success the browser navigates away to Google, nothing further to do here.
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
            style={{
                backgroundImage: `url(${backgroundImage})`
            }}
        >
            <div className="w-full max-w-md bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-12 relative overflow-hidden">
                {/* Decorative background blur */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-6">
                        <LogIn className="w-8 h-8 text-primary" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in</h1>
                    <p className="text-gray-500 text-center text-sm max-w-xs leading-relaxed">
                        Use your @kotu.co.in Google account to continue
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 rounded-xl py-3.5 font-semibold text-[15px] hover:bg-gray-50 transform active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                    <GoogleIcon />
                    {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                </button>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium mt-4">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}

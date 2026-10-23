import { useEffect, useState } from 'react';
import { Info, Paperclip, ScanLine, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import kotuLogo from '@/assets/kotu-logo.png';

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
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
        <div className="flex min-h-[100dvh] bg-card">
            {/* Brand panel — desktop & tablet landscape */}
            <aside className="hidden w-[46%] max-w-[680px] flex-col justify-between bg-primary px-14 py-12 text-primary-foreground lg:flex">
                <div className="flex items-center gap-2.5">
                    <img src={kotuLogo} alt="KOTU" width={36} height={36} className="h-9 w-9 rounded-[9px] ring-1 ring-primary-foreground/25" />
                    <span className="font-semibold">KOTU Asset Tracker</span>
                </div>
                <div className="space-y-6">
                    <h1 className="text-[40px] font-semibold leading-[48px] tracking-tight">Every asset. Every handover. One place.</h1>
                    <p className="max-w-md text-primary-foreground/80">
                        Track laptops, monitors and phones from purchase to retirement — with QR check-in/out, AMC reminders and signed handover forms.
                    </p>
                    <ul className="space-y-3 text-sm font-medium text-primary-foreground/90">
                        <li className="flex items-center gap-2.5"><ScanLine className="h-[18px] w-[18px]" /> Scan a QR label to check assets in or out</li>
                        <li className="flex items-center gap-2.5"><ShieldCheck className="h-[18px] w-[18px]" /> AMC &amp; warranty reminders before they lapse</li>
                        <li className="flex items-center gap-2.5"><Paperclip className="h-[18px] w-[18px]" /> Digital handover forms, signed by email</li>
                    </ul>
                </div>
                <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} KOTU · IT &amp; Tech</p>
            </aside>

            <main className="flex flex-1 items-center justify-center px-6 py-12">
                <div className="w-full max-w-[380px] space-y-5">
                    <img src={kotuLogo} alt="KOTU" width={48} height={48} className="h-12 w-12 rounded-xl lg:hidden" />
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
                        <p className="text-muted-foreground">Use your KOTU Google Workspace account to continue.</p>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={googleLoading}
                        className="flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-border-strong bg-card text-[15px] font-semibold shadow-xs transition-[background-color,transform] [transition-duration:120ms] hover:bg-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <GoogleIcon />
                        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                    </button>

                    {error ? (
                        <div role="alert" className="flex gap-2.5 rounded-lg bg-destructive-soft px-3 py-2.5 text-[13px] text-destructive-strong">
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    ) : (
                        <div className="flex gap-2.5 rounded-lg bg-subtle px-3 py-2.5 text-[13px] text-muted-foreground">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            Only @kotu.co.in accounts can sign in. New users get read-only access until an admin assigns a role.
                        </div>
                    )}

                    <p className="text-[13px] text-faint">Need access? Contact IT at tech@kotu.co.in</p>
                </div>
            </main>
        </div>
    );
}

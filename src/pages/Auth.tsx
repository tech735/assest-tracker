import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { mockUsers } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import type { UserRole as DatabaseUserRole } from '@/types/database';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import backgroundImage from '../assets/background-image.png';

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.998 11.998 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A11.998 11.998 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11z" />
        <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
);

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showContactAdmin, setShowContactAdmin] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const navigate = useNavigate();
    const { setUser, setOriginalAdminUser } = useUser();

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Form validation
        if (!email || !password) {
            setError('Email and password are required');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            setIsLoading(false);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            setIsLoading(false);
            return;
        }

        try {
            // Handle sign in logic
            if (email === 'tech@kotu.co.in' && password === 'test123') {
                console.log('Using mock authentication');
                const adminUser = mockUsers.admin;
                setUser(adminUser);
                setOriginalAdminUser(adminUser);
                navigate('/');
                return;
            }

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !profile) {
                setError('Invalid credentials');
                return;
            }

            // Type assertion for the profile data
            const typedProfile = profile as {
                id: string;
                full_name: string | null;
                email: string;
                role: DatabaseUserRole;
            };

            const userFromProfile = {
                id: typedProfile.id,
                name: typedProfile.full_name || 'User',
                email: typedProfile.email,
                role: typedProfile.role
            };

            setUser(userFromProfile);
            navigate('/');
        } catch (err: unknown) {
            console.error('Auth error:', err);
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
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

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in with email</h1>
                    <p className="text-gray-500 text-center text-sm max-w-xs leading-relaxed">
                        Please enter your email and password to sign in
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 rounded-xl py-3.5 font-semibold text-[15px] hover:bg-gray-50 transform active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm mb-4"
                >
                    <GoogleIcon />
                    {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400 font-medium">OR</span>
                    <div className="flex-1 h-px bg-gray-100" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                            <Mail className="w-5 h-5" />
                        </div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 text-gray-900 rounded-xl px-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all placeholder:text-gray-400 font-medium"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                            <Lock className="w-5 h-5" />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 text-gray-900 rounded-xl px-12 py-3.5 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all placeholder:text-gray-400 font-medium"
                            required
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>


                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowContactAdmin(true)}
                            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors bg-transparent border-none cursor-pointer p-0"
                        >
                            Forgot password?
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-[15px] hover:bg-primary/90 transform active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary/20 mt-2"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : 'Get Started'}
                    </button>
                </form>
            </div>

            {/* Contact Admin Message */}
            {showContactAdmin && (
                <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-4 max-w-sm animate-in slide-in-from-bottom-2 fade-in duration-300 z-50 flex items-start gap-3">
                    <div className="bg-blue-50 text-primary p-2 rounded-lg">
                        <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">Contact Administrator</h4>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                            Please contact your system administrator to reset your password.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowContactAdmin(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                        <span className="sr-only">Dismiss</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}

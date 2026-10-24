import type { User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/contexts/UserContext';
import type { UserRole } from '@/types/database';

type ProfileRow = { id: string; full_name: string | null; email: string; role: UserRole };

/** Turn a signed-in Supabase user into the app's user record, or null when no profile exists yet. */
export async function profileUserFor(authUser: AuthUser): Promise<User | null> {
  const byId = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  let profile = byId.data as ProfileRow | null;

  if (!profile && authUser.email) {
    // Falls back to an account created before it had a Supabase Auth identity.
    const byEmail = await supabase.from('profiles').select('*').eq('email', authUser.email).maybeSingle();
    profile = byEmail.data as ProfileRow | null;
  }
  if (!profile) return null;

  return {
    id: profile.id,
    name: profile.full_name || (authUser.user_metadata?.full_name as string) || 'User',
    email: profile.email,
    role: profile.role,
  };
}

/** Where to go after sign-in: the page the user originally asked for, if it's a safe in-app path. */
export function takePostLoginRedirect(): string | null {
  const next = sessionStorage.getItem('postLoginRedirect');
  sessionStorage.removeItem('postLoginRedirect');
  // In-app paths only: no protocol-relative "//host", no backslashes ("/\host"), no control characters.
  // eslint-disable-next-line no-control-regex
  return next && next.startsWith('/') && !next.startsWith('//') && !/[\\\u0000-\u001f]/.test(next) ? next : null;
}

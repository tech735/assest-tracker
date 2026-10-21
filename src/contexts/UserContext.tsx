import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { UserRole } from '@/types/database';
import { supabase } from '@/lib/supabase';

// Re-export UserRole for convenience
export type { UserRole } from '@/types/database';

export interface User {
    id: string;
    name: string;
    role: UserRole;
    email: string;
}

interface UserContextType {
    user: User | null;
    originalAdminUser: User | null;
    setUser: (user: User | null) => void;
    setOriginalAdminUser: (user: User | null) => void;
    logout: () => void;
    isLoading: boolean;
    hasFullAccess: () => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [originalAdminUser, setOriginalAdminUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Restore the persisted user only if a real Supabase session backs it - a stale entry
        // (e.g. from the removed mock login) would otherwise show the app shell with no data access.
        const checkPersistedUser = async () => {
            // Read synchronously: the persist effects below clear these keys on the first render,
            // before getSession() resolves.
            const persistedUser = localStorage.getItem('user');
            const persistedOriginalAdmin = localStorage.getItem('originalAdminUser');

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const parsedUser: User | null = persistedUser ? JSON.parse(persistedUser) : null;
                const sessionEmail = session?.user.email?.toLowerCase();

                if (parsedUser && sessionEmail && parsedUser.email.toLowerCase() === sessionEmail) {
                    setUser(parsedUser);

                    if (persistedOriginalAdmin) {
                        setOriginalAdminUser(JSON.parse(persistedOriginalAdmin));
                    }
                }
            } catch (error) {
                console.error('Error parsing persisted user:', error);
                // Clear corrupted data
                localStorage.removeItem('user');
                localStorage.removeItem('originalAdminUser');
            }

            setIsLoading(false);
        };

        checkPersistedUser();
    }, []);

    // Persist user state to localStorage whenever it changes
    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    // Persist original admin user state
    useEffect(() => {
        if (originalAdminUser) {
            localStorage.setItem('originalAdminUser', JSON.stringify(originalAdminUser));
        } else {
            localStorage.removeItem('originalAdminUser');
        }
    }, [originalAdminUser]);

    const logout = () => {
        setUser(null);
        setOriginalAdminUser(null);
    };

    const hasFullAccess = () => {
        return originalAdminUser?.role === 'ADMIN' || user?.role === 'ADMIN';
    };

    return (
        <UserContext.Provider value={{ user, originalAdminUser, setUser, setOriginalAdminUser, logout, isLoading, hasFullAccess }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}

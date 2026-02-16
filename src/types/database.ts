export type UserRole = 'SUPPORT' | 'WAREHOUSE' | 'INVOICING' | 'ADMIN';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

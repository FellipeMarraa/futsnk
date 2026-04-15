import type {User} from 'firebase/auth';

export interface AppUser extends User {
    nomeLista?: string | null;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    isPro?: boolean;
    planExpiresAt?: string | null;
}

export interface Group {
    id: string;
    name: string;
}
import type {User} from 'firebase/auth';

export interface AppUser extends User {
    nomeLista?: string | null;
    isAdmin?: boolean;
}

export interface Group {
    id: string;
    name: string;
}
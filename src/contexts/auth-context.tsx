import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import type {AppUser, Group} from "@/lib/auth.ts";

interface AuthContextType {
  user: AppUser | null;
  isAdmin: boolean;
  isSuperAdmin: boolean; // ADICIONADO: Para controle global do SaaS
  nomeLista: string | null;
  loading: boolean;
  userGroups: Group[];
  activeGroup: Group | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setActiveGroup: (group: Group) => void;
  refreshGroups: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // ADICIONADO ESTADO
  const [nomeLista, setNomeLista] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  const fetchGroups = async (email: string) => {
    const groupsQuery = query(
        collection(db, 'groups'),
        where('membersEmails', 'array-contains', email.toLowerCase())
    );
    const groupsSnap = await getDocs(groupsQuery);
    const groups = groupsSnap.docs.map(d => ({
      id: d.id,
      name: d.data().name
    })) as Group[]; // Cast para garantir tipagem
    setUserGroups(groups);
    if (groups.length > 0 && !activeGroup) setActiveGroup(groups[0]);
  };

  useEffect(() => {
    let unsubscribeFirestore: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        unsubscribeFirestore = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Espalha os dados do Firebase Auth e do Firestore no objeto User
            setUser({ ...firebaseUser, ...data } as AppUser);

            // Sincroniza permissões
            setIsAdmin(data.isAdmin || false);
            setIsSuperAdmin(data.isSuperAdmin || false); // SINCRONIZAÇÃO DO CAMPO SUPREMO
            setNomeLista(data.nomeLista || null);
          } else {
            // Caso o documento não exista (primeiro login via Google no sistema)
            setDoc(doc(db, 'users', firebaseUser.uid), {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              isAdmin: false,
              isSuperAdmin: false, // Por padrão nasce como false
              nomeLista: null,
              createdAt: new Date()
            });
          }
        });

        if (firebaseUser.email) await fetchGroups(firebaseUser.email);
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false); // Reset ao deslogar
        setNomeLista(null);
        setUserGroups([]);
        setActiveGroup(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshGroups = async () => {
    if (user?.email) await fetchGroups(user.email);
  };

  return (
      <AuthContext.Provider value={{
        user,
        isAdmin,
        isSuperAdmin,
        nomeLista,
        loading,
        userGroups,
        activeGroup,
        loginWithGoogle,
        logout,
        setActiveGroup,
        refreshGroups
      }}>
        {children}
      </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return context;
};
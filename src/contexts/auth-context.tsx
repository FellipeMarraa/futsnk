import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  type User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';

interface Group {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nomeLista, setNomeLista] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  // Função para sincronizar/buscar dados do Firestore
  const fetchUserData = async (firebaseUser: User) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      let userData = userDoc.data();

      // Se o usuário logou com Google e não tem documento no Firestore ainda, criamos um básico
      if (!userDoc.exists()) {
        userData = {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isAdmin: false,
          nomeLista: null, // Admin preencherá isso depois
          createdAt: new Date()
        };
        await setDoc(userDocRef, userData);
      }

      setIsAdmin(userData?.isAdmin || false);
      setNomeLista(userData?.nomeLista || null);

      // Busca grupos (por ID de usuário ou Email)
      const groupsQuery = query(
          collection(db, 'groups'),
          where('membersEmails', 'array-contains', firebaseUser.email?.toLowerCase())
      );

      const groupsSnap = await getDocs(groupsQuery);
      const groups = groupsSnap.docs.map(d => ({
        id: d.id,
        name: d.data().name
      }));

      setUserGroups(groups);
      if (groups.length > 0 && !activeGroup) {
        setActiveGroup(groups[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchUserData(firebaseUser);
      } else {
        setUser(null);
        setIsAdmin(false);
        setNomeLista(null);
        setUserGroups([]);
        setActiveGroup(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshGroups = async () => {
    if (user) await fetchUserData(user);
  };

  return (
      <AuthContext.Provider value={{
        user,
        isAdmin,
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
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { type User } from 'firebase/auth';
import {
  createAccountWithEmail,
  observeAuth,
  signInWithEmail,
  signOutCurrentUser,
} from './authService';
import { DEMO_USER_ID, isDemoAuthMode } from '../firebase/seedDemoData';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => ReturnType<typeof signInWithEmail>;
  createAccount: (
    email: string,
    password: string,
  ) => ReturnType<typeof createAccountWithEmail>;
  signOut: () => ReturnType<typeof signOutCurrentUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const createDemoUser = (): User => {
  return {
    uid: DEMO_USER_ID,
    email: 'demo-user@local.test',
    emailVerified: true,
    isAnonymous: false,
    providerId: 'demo',
    providerData: [],
    metadata: null,
  } as unknown as User;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const demoMode = isDemoAuthMode();
  const demoUser = useMemo(() => createDemoUser(), []);
  const [user, setUser] = useState<User | null>(demoMode ? demoUser : null);
  const [loading, setLoading] = useState(!demoMode);

  useEffect(() => {
    if (demoMode) return;

    const unsubscribe = observeAuth((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [demoMode, demoUser]);

  const signIn = (email: string, password: string) => {
    if (demoMode) {
      setUser(demoUser);
      return Promise.resolve({
        user: demoUser,
      } as unknown as ReturnType<typeof signInWithEmail>);
    }

    return signInWithEmail(email, password);
  };

  const createAccount = (email: string, password: string) => {
    if (demoMode) {
      setUser(demoUser);
      return Promise.resolve({
        user: demoUser,
      } as unknown as ReturnType<typeof createAccountWithEmail>);
    }

    return createAccountWithEmail(email, password);
  };

  const signOut = () => {
    if (demoMode) {
      setUser(null);
      return Promise.resolve(undefined as unknown as ReturnType<typeof signOutCurrentUser>);
    }

    return signOutCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        createAccount,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

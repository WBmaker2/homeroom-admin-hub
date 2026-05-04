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
import { DEMO_USER_ID, isDemoAuthMode } from '../firebase/environment';

type AuthResult = Promise<{ user: User }>;

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => AuthResult;
  createAccount: (email: string, password: string) => AuthResult;
  signOut: () => Promise<void>;
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
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void import('./authService')
      .then(({ observeAuth }) => {
        if (cancelled) return;

        unsubscribe = observeAuth((currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
      })
      .catch((error: unknown) => {
        console.error('Firebase auth failed to initialize.', error);
        if (cancelled) return;
        setUser(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [demoMode]);

  const signIn = (email: string, password: string) => {
    if (demoMode) {
      setUser(demoUser);
      return Promise.resolve({
        user: demoUser,
      });
    }

    return import('./authService').then(({ signInWithEmail }) =>
      signInWithEmail(email, password),
    );
  };

  const createAccount = (email: string, password: string) => {
    if (demoMode) {
      setUser(demoUser);
      return Promise.resolve({
        user: demoUser,
      });
    }

    return import('./authService').then(({ createAccountWithEmail }) =>
      createAccountWithEmail(email, password),
    );
  };

  const signOut = () => {
    if (demoMode) {
      setUser(null);
      return Promise.resolve();
    }

    return import('./authService').then(({ signOutCurrentUser }) => signOutCurrentUser());
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

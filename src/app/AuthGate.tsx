import { type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

type AuthGateProps = {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
};

export function AuthGate({
  children,
  fallback,
  loadingFallback,
}: AuthGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return loadingFallback ? <>{loadingFallback}</> : null;
  }

  if (!user) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

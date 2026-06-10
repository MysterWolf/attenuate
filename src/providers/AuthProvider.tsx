import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getStoredTokens } from '../services/authService';

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  authStatus:    AuthStatus;
  onAuthSuccess: () => void;
  onAuthRevoked: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  authStatus:    'checking',
  onAuthSuccess: () => {},
  onAuthRevoked: () => {},
});

interface Props {
  children: React.ReactNode;
  // Splash must complete before we render the auth gate
  splashDone: boolean;
}

export function AuthProvider({ children, splashDone }: Props) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');

  useEffect(() => {
    if (!splashDone) return;
    getStoredTokens()
      .then(tokens => setAuthStatus(tokens ? 'authenticated' : 'unauthenticated'))
      .catch(() => setAuthStatus('unauthenticated'));
  }, [splashDone]);

  const onAuthSuccess  = useCallback(() => setAuthStatus('authenticated'), []);
  const onAuthRevoked  = useCallback(() => setAuthStatus('unauthenticated'), []);

  const value = useMemo<AuthContextValue>(
    () => ({ authStatus, onAuthSuccess, onAuthRevoked }),
    [authStatus, onAuthSuccess, onAuthRevoked],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

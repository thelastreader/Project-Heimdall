/**
 * Provides authenticated user state to the React tree.
 * Restores the server session on mount and exposes login, registration, and logout transitions through context.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getCurrentUser, login as requestLogin, logout as requestLogout, register as requestRegister } from '../services/api';
import type { AuthUser } from '../services/api';
import { AuthContext } from './context';

export default function AuthProvider({ children }: { children: ReactNode }) {
  
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getCurrentUser().then(({ user: current }) => setUser(current)).catch(() => setUser(null)).finally(() => setReady(true));
    const onExpired = () => setUser(null);
    window.addEventListener('tb-auth-expired', onExpired);
    return () => window.removeEventListener('tb-auth-expired', onExpired);
  }, []);

  const value = useMemo(() => ({
    user, ready,
    async login(credentials: { email: string; password: string; remember_me: boolean }) {
      const result = await requestLogin(credentials);
      setUser(result.user);
      return result.user;
    },
    async register(data: { first_name: string; last_name: string; username: string; email: string; password: string; remember_me: boolean }) {
      const result = await requestRegister(data);
      setUser(result.user);
      return result.user;
    },
    async logout() {
      await requestLogout();
      setUser(null);
    },
  }), [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken } from './api';
import type { User } from './types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const result = await api<{ success: boolean; user: User }>('/v1/auth/me');
      setUser(result.user);
    } catch {
      setUser(null);
      setToken(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const result = await api<{ success: boolean; token: string; user: User }>('/v1/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password })
    });
    setToken(result.token);
    setUser(result.user);
  };

  const logout = async () => {
    try { await api('/v1/auth/logout', { method: 'POST' }); } finally { setToken(null); setUser(null); }
  };

  const value = useMemo(() => ({ user, loading, login, logout, refresh }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

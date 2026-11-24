'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError, type Utilisateur } from './api';

interface AuthContextValue {
  user: Utilisateur | null;
  pret: boolean;
  connexion: (email: string, motDePasse: string) => Promise<void>;
  deconnexion: () => Promise<void>;
  /** Agents et administrateurs : traitement des dossiers. Les assureurs sont en lecture seule. */
  autorite: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const ROLES_DASHBOARD = ['agent', 'administrateur', 'assureur'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [pret, setPret] = useState(false);

  // La session vit dans un cookie httpOnly : on demande simplement à l'API qui est connecté.
  useEffect(() => {
    api<Utilisateur>('/auth/moi', { silencieux401: true })
      .then((u) => setUser(ROLES_DASHBOARD.includes(u.role) ? u : null))
      .catch(() => setUser(null))
      .finally(() => setPret(true));
  }, []);

  const connexion = useCallback(async (email: string, motDePasse: string) => {
    const res = await api<{ user: Utilisateur }>('/auth/login', { method: 'POST', json: { email, motDePasse }, silencieux401: true });
    // Le dashboard est réservé aux autorités et aux assureurs : un compte conducteur est refusé.
    if (!ROLES_DASHBOARD.includes(res.user.role)) {
      await api('/auth/deconnexion', { method: 'POST' });
      throw new ApiError(403, 'Ce compte n’a pas accès au dashboard.');
    }
    setUser(res.user);
  }, []);

  const deconnexion = useCallback(async () => {
    await api('/auth/deconnexion', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const autorite = user?.role === 'agent' || user?.role === 'administrateur';
  return <AuthContext.Provider value={{ user, pret, connexion, deconnexion, autorite }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}

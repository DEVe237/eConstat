/** Préfixe des appels : relayé vers l'API par next.config.ts (même origine, cookie de session). */
export const API = '/api';

export type Role = 'usager' | 'agent' | 'administrateur' | 'assureur';

export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  role: Role;
  matricule?: string | null;
  unite?: string | null;
  compagnie?: string | null;
  actif?: boolean;
  dateCreation?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function messageErreur(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (Array.isArray(m)) return m.join(' · ');
    if (typeof m === 'string') return m;
  }
  return `Erreur ${status}`;
}

/**
 * Appel JSON à l'API. L'authentification passe par le cookie httpOnly posé
 * à la connexion : le jeton n'est jamais manipulé par le code de la page.
 */
export async function api<T>(path: string, init: RequestInit & { json?: unknown; silencieux401?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${API}${path}`, { ...init, headers, body, credentials: 'same-origin' });
  if (res.status === 401 && !init.silencieux401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login?expire=1';
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, messageErreur(data, res.status));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Téléchargement d'un fichier protégé (export PDF, preuve d'horodatage). */
export async function telecharger(path: string, nomFichier: string) {
  const res = await fetch(`${API}${path}`, { credentials: 'same-origin' });
  if (!res.ok) throw new ApiError(res.status, `Téléchargement impossible (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  a.click();
  URL.revokeObjectURL(url);
}

/** URL d'un fichier ou d'une page servis par l'API (liens signés /fichiers/..., visionneuse 3D). */
export const viaApi = (url: string) => (url.startsWith('http') ? url : `${API}${url}`);

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Chargement } from '@/components/ui';
import { api, type Role } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const NAV: { href: string; libelle: string; icone: string; roles: Role[] }[] = [
  { href: '/dossiers', libelle: 'Dossiers', icone: 'M9 12h6m-6 4h6M7 4h7l5 5v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z', roles: ['agent', 'administrateur', 'assureur'] },
  { href: '/statistiques', libelle: 'Statistiques', icone: 'M4 20V10m6 10V4m6 16v-7m4 7H3', roles: ['agent', 'administrateur'] },
  { href: '/utilisateurs', libelle: 'Comptes', icone: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1m18 0v-1a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', roles: ['administrateur'] },
  { href: '/compte', libelle: 'Mon compte', icone: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0', roles: ['agent', 'administrateur', 'assureur'] },
];

const LIBELLE_ROLE: Record<string, string> = { administrateur: 'Administrateur', agent: 'Agent', assureur: 'Assureur' };

/** Nombre de dossiers en attente, rafraîchi toutes les 30 s, avec une alerte quand il augmente. */
function useDossiersATraiter(actif: boolean) {
  const [n, setN] = useState<number | null>(null);
  const [alerte, setAlerte] = useState<string | null>(null);
  const precedent = useRef<number | null>(null);
  useEffect(() => {
    if (!actif) return;
    let annule = false;
    const verifier = async () => {
      try {
        const { total } = await api<{ total: number }>('/dashboard/dossiers?statut=transmis&limite=1');
        if (annule) return;
        if (precedent.current !== null && total > precedent.current) {
          const nouveaux = total - precedent.current;
          setAlerte(`${nouveaux} nouveau${nouveaux > 1 ? 'x' : ''} dossier${nouveaux > 1 ? 's' : ''} à traiter`);
        }
        precedent.current = total;
        setN(total);
      } catch {
        /* réseau indisponible : nouvel essai au prochain passage */
      }
    };
    verifier();
    const t = setInterval(verifier, 30_000);
    return () => {
      annule = true;
      clearInterval(t);
    };
  }, [actif]);
  return { n, alerte, fermerAlerte: () => setAlerte(null) };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, pret, deconnexion, autorite } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { n, alerte, fermerAlerte } = useDossiersATraiter(pret && autorite);

  useEffect(() => {
    if (pret && !user) router.replace('/login');
  }, [pret, user, router]);

  useEffect(() => {
    if (!alerte) return;
    const t = setTimeout(fermerAlerte, 8000);
    return () => clearTimeout(t);
  }, [alerte, fermerAlerte]);

  if (!pret || !user) return <div className="p-10"><Chargement /></div>;
  const liens = NAV.filter((l) => l.roles.includes(user.role));
  const badge = (href: string) => (href === '/dossiers' && autorite && n ? n : null);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-brand-900 px-4 py-6 text-white md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <img src="/embleme.png" alt="" className="h-10 w-10 rounded-lg bg-white object-contain p-0.5" />
          <div>
            <p className="text-sm font-bold leading-tight">eConstat</p>
            <p className="text-[11px] text-brand-200/70">{user.role === 'assureur' ? 'Espace assureurs' : 'Espace autorités'}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {liens.map((l) => {
            const actif = pathname.startsWith(l.href);
            const b = badge(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${actif ? 'bg-white/10 text-white' : 'text-brand-100/70 hover:bg-white/5 hover:text-white'}`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d={l.icone} />
                </svg>
                {l.libelle}
                {b ? (
                  <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-brand-900" title="Dossiers à traiter">{b}</span>
                ) : (
                  actif && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-xl bg-white/5 p-3">
          <p className="truncate text-sm font-semibold">{user.prenom} {user.nom}</p>
          <p className="truncate text-xs text-brand-200/70">
            {LIBELLE_ROLE[user.role] ?? user.role}
            {user.role === 'assureur' ? (user.compagnie ? ` · ${user.compagnie}` : '') : user.unite ? ` · ${user.unite}` : ''}
          </p>
          <button onClick={deconnexion} className="mt-3 text-xs font-semibold text-accent hover:underline">Se déconnecter</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
          <span className="font-bold text-brand-900">eConstat</span>
          <div className="flex gap-3 text-sm font-medium">
            {liens.map((l) => (
              <Link key={l.href} href={l.href} className={pathname.startsWith(l.href) ? 'text-brand-700' : 'text-zinc-500'}>
                {l.libelle}{badge(l.href) ? ` (${badge(l.href)})` : ''}
              </Link>
            ))}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">{children}</main>
      </div>

      {alerte && (
        <div role="status" className="fixed bottom-6 right-6 z-[900] flex items-center gap-4 rounded-2xl bg-brand-900 px-5 py-4 text-sm text-white shadow-2xl">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
          <span className="font-semibold">{alerte}</span>
          <button
            className="font-semibold text-accent hover:underline"
            onClick={() => {
              fermerAlerte();
              router.push('/dossiers');
            }}
          >
            Voir
          </button>
          <button aria-label="Fermer" className="text-brand-200 hover:text-white" onClick={fermerAlerte}>✕</button>
        </div>
      )}
    </div>
  );
}

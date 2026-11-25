'use client';

import { BarChart3, Bell, Check, ChevronsUpDown, FileText, LayoutDashboard, LogOut, Menu as IconeMenu, PanelLeft, Search, User, Users, X, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BoutonTheme, THEMES, useTheme } from '@/components/theme';
import { Avatar, Bouton, entreeMenuCls, Menu, Modale, StatutBadge } from '@/components/ui';
import { api, type Role, type Utilisateur } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { depuis, ROLES } from '@/lib/format';
import type { DossierResume, ListeDossiers } from '@/lib/types';

const NAV: { href: string; libelle: string; Icone: LucideIcon; roles: Role[] }[] = [
  { href: '/tableau-de-bord', libelle: 'Tableau de bord', Icone: LayoutDashboard, roles: ['agent', 'administrateur'] },
  { href: '/dossiers', libelle: 'Dossiers', Icone: FileText, roles: ['agent', 'administrateur', 'assureur'] },
  { href: '/statistiques', libelle: 'Statistiques', Icone: BarChart3, roles: ['agent', 'administrateur'] },
  { href: '/utilisateurs', libelle: 'Comptes', Icone: Users, roles: ['administrateur'] },
];

const sousTitre = (u: Utilisateur) => [ROLES[u.role] ?? u.role, u.role === 'assureur' ? u.compagnie : u.unite].filter(Boolean).join(' · ');

function LienNav({ href, libelle, Icone, actif, badge, reduit, onClick }: { href: string; libelle: string; Icone: LucideIcon; actif: boolean; badge?: number | null; reduit: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={reduit ? libelle : undefined}
      aria-current={actif ? 'page' : undefined}
      className={`relative flex h-10 items-center gap-2.5 rounded-md text-base transition ${reduit ? 'justify-center px-0' : 'px-3'} ${actif ? 'bg-primary font-medium text-white shadow-md' : 'hover:bg-muted'}`}
    >
      <Icone className="size-5 shrink-0" aria-hidden />
      {!reduit && <span className="flex-1 truncate">{libelle}</span>}
      {badge ? (
        reduit ? (
          <span className="absolute right-1 top-1 size-2.5 rounded-full bg-amber-400 ring-2 ring-sidebar" aria-label={`${badge} à traiter`} />
        ) : (
          <span title="Dossiers à traiter" className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${actif ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 dark:bg-amber-400 dark:text-black'}`}>{badge}</span>
        )
      ) : null}
    </Link>
  );
}

function Lateral({ user, pathname, aTraiter, reduit, onNaviguer, onDeconnexion }: { user: Utilisateur; pathname: string; aTraiter: number | null; reduit: boolean; onNaviguer?: () => void; onDeconnexion: () => void }) {
  const { theme, changer } = useTheme();
  const nom = `${user.prenom} ${user.nom}`;
  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <Link href="/" onClick={onNaviguer} className={`flex items-center gap-3 rounded-md p-2 ${reduit ? 'justify-center' : ''}`}>
        <img src="/embleme.png" alt="" className={`shrink-0 object-contain ${reduit ? 'size-8' : 'size-12'}`} />
        {!reduit && (
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold leading-tight text-primary-texte">eConstat</span>
            <span className="mt-0.5 inline-block rounded-full border px-2 text-[11px] font-medium text-muted-foreground">{user.role === 'assureur' ? 'Espace assureurs' : 'Espace autorités'}</span>
          </span>
        )}
      </Link>

      <nav aria-label="Navigation principale" className="space-y-1 p-1">
        {NAV.filter((l) => l.roles.includes(user.role)).map((l) => (
          <LienNav key={l.href} {...l} actif={pathname.startsWith(l.href)} badge={l.href === '/dossiers' ? aTraiter : null} reduit={reduit} onClick={onNaviguer} />
        ))}
      </nav>

      <div className="space-y-1 p-1">
        {reduit ? <div className="mx-2 border-t" /> : <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-texte">Mon activité</p>}
        <LienNav href="/compte" libelle="Mon compte" Icone={User} actif={pathname.startsWith('/compte')} reduit={reduit} onClick={onNaviguer} />
        <button
          type="button"
          onClick={onDeconnexion}
          title={reduit ? 'Se déconnecter' : undefined}
          aria-label="Se déconnecter"
          className={`flex h-10 w-full items-center gap-2.5 rounded-md text-base text-rose-600 transition hover:bg-rose-600/10 dark:text-rose-400 ${reduit ? 'justify-center' : 'px-3'}`}
        >
          <LogOut className="size-5 shrink-0" aria-hidden />
          {!reduit && 'Se déconnecter'}
        </button>
      </div>

      <div className="mt-auto">
        <Menu
          className="bottom-full left-0 mb-1 w-60"
          bouton={(ouvert, basculer) => (
            <button
              type="button"
              aria-expanded={ouvert}
              aria-label="Menu du compte"
              onClick={basculer}
              className={`flex w-full items-center gap-2.5 rounded-md p-2 text-left transition hover:bg-muted ${reduit ? 'justify-center' : ''}`}
            >
              <Avatar nom={nom} taille="sm" />
              {!reduit && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{nom}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </>
              )}
            </button>
          )}
        >
          {(fermer) => (
            <>
              <p className="truncate px-3 py-1.5 text-xs text-muted-foreground">{sousTitre(user)}</p>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">Thème</p>
              {THEMES.map(({ valeur, libelle, Icone }) => (
                <button key={valeur} type="button" className={entreeMenuCls} onClick={() => { changer(valeur); fermer(); }}>
                  <Icone /> {libelle} {theme === valeur && <Check className="ml-auto" />}
                </button>
              ))}
            </>
          )}
        </Menu>
      </div>
    </div>
  );
}

/** Recherche globale (Ctrl K) : plaque, conducteur ou numéro de dossier. */
function Recherche({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [resultats, setResultats] = useState<DossierResume[] | null>(null);
  const [choix, setChoix] = useState(0);

  useEffect(() => {
    if (!ouvert) return;
    setQ('');
    setResultats(null);
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [ouvert, onFermer]);

  useEffect(() => {
    const texte = q.trim();
    if (!texte) return setResultats(null);
    let annule = false;
    const t = setTimeout(async () => {
      try {
        const { items } = await api<ListeDossiers>(`/dashboard/dossiers?${new URLSearchParams({ q: texte, limite: '8' })}`);
        if (annule) return;
        setResultats(items);
        setChoix(0);
      } catch {
        if (!annule) setResultats([]);
      }
    }, 250);
    return () => {
      annule = true;
      clearTimeout(t);
    };
  }, [q]);

  if (!ouvert) return null;
  const aller = (id: string) => {
    onFermer();
    router.push(`/dossiers/${id}`);
  };
  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={onFermer}>
      <div role="dialog" aria-modal="true" aria-label="Rechercher un dossier" className="apparition w-full max-w-xl overflow-hidden rounded-lg border bg-card shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              const n = resultats?.length ?? 0;
              if (e.key === 'ArrowDown' && n) { e.preventDefault(); setChoix((c) => (c + 1) % n); }
              if (e.key === 'ArrowUp' && n) { e.preventDefault(); setChoix((c) => (c - 1 + n) % n); }
              if (e.key === 'Enter' && resultats?.[choix]) aller(resultats[choix].id);
            }}
            placeholder="Plaque, conducteur ou n° de dossier…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button type="button" aria-label="Fermer" onClick={onFermer} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {resultats === null ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{q.trim() ? 'Recherche…' : 'Tapez une plaque, un nom ou un numéro.'}</p>
          ) : resultats.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun dossier trouvé.</p>
          ) : (
            resultats.map((d, i) => (
              <button key={d.id} type="button" onMouseEnter={() => setChoix(i)} onClick={() => aller(d.id)} className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${i === choix ? 'bg-muted' : ''}`}>
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{d.numero}</span>
                  <span className="block truncate text-xs text-muted-foreground">{d.vehicules.map((v) => `${v.plaque} ${v.conducteurNom}`).join(' · ') || 'Aucun véhicule'}</span>
                </span>
                <StatutBadge statut={d.statut} />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Cloche({ n }: { n: number | null }) {
  const [items, setItems] = useState<DossierResume[] | null>(null);
  const charger = () => {
    setItems(null);
    api<ListeDossiers>('/dashboard/dossiers?statut=transmis&limite=5').then((r) => setItems(r.items)).catch(() => setItems([]));
  };
  return (
    <Menu
      className="right-0 top-full mt-1 w-80 max-w-[calc(100vw-2rem)]"
      bouton={(ouvert, basculer) => (
        <button
          type="button"
          aria-expanded={ouvert}
          aria-label={`${n ?? 0} dossiers à traiter`}
          onClick={() => { if (!ouvert) charger(); basculer(); }}
          className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-4.5" />
          {n ? <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{n > 99 ? '99+' : n}</span> : null}
        </button>
      )}
    >
      {(fermer) => (
        <>
          <p className="px-3 py-2 text-sm font-semibold">Dossiers à traiter</p>
          {items === null ? (
            <p className="px-3 pb-3 text-sm text-muted-foreground">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="px-3 pb-3 text-sm text-muted-foreground">Rien en attente.</p>
          ) : (
            items.map((d) => (
              <Link key={d.id} href={`/dossiers/${d.id}`} onClick={fermer} className="block rounded-md px-3 py-2 hover:bg-muted">
                <span className="flex justify-between gap-2"><b>{d.numero}</b><span className="text-xs text-muted-foreground">{depuis(d.dateTransmission)}</span></span>
                <span className="block truncate text-xs text-muted-foreground">{d.vehicules.map((v) => v.plaque).join(' / ') || 'Aucun véhicule'}</span>
              </Link>
            ))
          )}
          <Link href="/dossiers" onClick={fermer} className="mt-1 block rounded-md border-t px-3 py-2 text-center text-sm font-medium text-primary-texte hover:bg-muted">Voir tous les dossiers</Link>
        </>
      )}
    </Menu>
  );
}

/** Cadre de toutes les pages connectées : barre latérale repliable, en-tête, contenu. */
export function Coquille({ aTraiter, children }: { aTraiter: number | null; children: React.ReactNode }) {
  const { user, deconnexion, autorite } = useAuth();
  const pathname = usePathname();
  const [reduit, setReduit] = useState(false);
  const [tiroir, setTiroir] = useState(false);
  const [recherche, setRecherche] = useState(false);
  const [quitter, setQuitter] = useState(false);
  const contenu = useRef<HTMLDivElement>(null);
  const fermerRecherche = useCallback(() => setRecherche(false), []);

  useEffect(() => {
    try {
      setReduit(localStorage.getItem('menu') === 'reduit');
    } catch {
      /* stockage indisponible : menu ouvert */
    }
  }, []);
  const basculer = useCallback(() => {
    setReduit((r) => {
      try {
        localStorage.setItem('menu', r ? 'ouvert' : 'reduit');
      } catch {
        /* sans effet */
      }
      return !r;
    });
  }, []);

  useEffect(() => {
    const raccourcis = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 'k') { e.preventDefault(); setRecherche(true); }
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); basculer(); }
    };
    window.addEventListener('keydown', raccourcis);
    return () => window.removeEventListener('keydown', raccourcis);
  }, [basculer]);

  // Nouvelle page : on repart en haut du contenu.
  useEffect(() => {
    setTiroir(false);
    contenu.current?.scrollTo(0, 0);
  }, [pathname]);

  if (!user) return null;
  const nom = `${user.prenom} ${user.nom}`;
  const lateral = { user, pathname, aTraiter, onDeconnexion: () => setQuitter(true) };

  return (
    <div className="flex h-dvh bg-sidebar">
      <aside className={`hidden shrink-0 transition-[width] duration-300 md:block ${reduit ? 'w-16' : 'w-72'}`}>
        <Lateral {...lateral} reduit={reduit} />
      </aside>

      {tiroir && (
        <div className="fixed inset-0 z-[900] bg-black/50 md:hidden" onMouseDown={() => setTiroir(false)}>
          <aside className="h-full w-72 max-w-[85vw] bg-sidebar shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <Lateral {...lateral} reduit={false} onNaviguer={() => setTiroir(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden border bg-fond md:my-2 md:mr-2 md:rounded-lg md:shadow-sm">
        <header className="relative z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card px-3">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Ouvrir le menu" onClick={() => setTiroir(true)} className="flex size-9 items-center justify-center rounded-md hover:bg-muted md:hidden"><IconeMenu className="size-5" /></button>
            <button type="button" aria-label={reduit ? 'Déplier le menu' : 'Replier le menu'} title="Ctrl B" onClick={basculer} className="hidden size-9 items-center justify-center rounded-md hover:bg-muted md:flex"><PanelLeft className="size-4.5" /></button>
            <span className="hidden h-6 border-l md:block" />
            <button type="button" aria-label="Rechercher un dossier" onClick={() => setRecherche(true)} className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground transition hover:bg-muted">
              <Search className="size-4" /> <span className="hidden sm:inline">Rechercher…</span>
              <kbd className="ml-2 hidden rounded bg-muted px-1.5 py-0.5 text-[11px] lg:inline">Ctrl K</kbd>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <BoutonTheme />
            {autorite && <Cloche n={aTraiter} />}
            <Link href="/compte" className="ml-1 flex items-center gap-2 rounded-md p-1 transition hover:bg-muted sm:pr-3">
              <Avatar nom={nom} taille="sm" />
              <span className="hidden leading-tight sm:block">
                <span className="block text-sm font-medium">{nom}</span>
                <span className="block text-xs text-muted-foreground">{ROLES[user.role] ?? user.role}</span>
              </span>
            </Link>
          </div>
        </header>
        <div ref={contenu} className="flex-1 overflow-y-auto">
          <main key={pathname} className="apparition mx-auto max-w-[1600px] p-4 md:p-6">{children}</main>
        </div>
      </div>

      <Recherche ouvert={recherche} onFermer={fermerRecherche} />
      <Modale ouvert={quitter} titre="Se déconnecter ?" onFermer={() => setQuitter(false)}>
        <p className="text-sm text-muted-foreground">Vous devrez saisir de nouveau votre mot de passe pour revenir sur le dashboard.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Bouton variante="secondaire" onClick={() => setQuitter(false)}>Annuler</Bouton>
          <Bouton variante="danger" onClick={deconnexion}><LogOut /> Oui, me déconnecter</Bouton>
        </div>
      </Modale>
    </div>
  );
}

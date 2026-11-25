'use client';

import { AlertTriangle, CheckCircle2, Clock, FileText, Inbox, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { STATUTS } from '@/lib/format';
import type { Statut } from '@/lib/types';

const ICONES_STATUT: Record<Statut, LucideIcon> = { transmis: Clock, valide: CheckCircle2, conteste: AlertTriangle, brouillon: FileText };

export function StatutBadge({ statut }: { statut: Statut }) {
  const s = STATUTS[statut];
  const Icone = ICONES_STATUT[statut];
  return (
    <span className={`inline-flex h-6 w-fit items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${s.classes}`}>
      <Icone className="size-3" aria-hidden />
      {s.libelle}
    </span>
  );
}

export function Pastille({ children, ton = 'neutre' }: { children: React.ReactNode; ton?: 'neutre' | 'primaire' | 'bleu' | 'vert' | 'ambre' | 'rouge' }) {
  const tons = {
    neutre: 'bg-muted text-muted-foreground',
    primaire: 'bg-primary-soft text-primary-texte',
    bleu: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    vert: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    ambre: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    rouge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  };
  return <span className={`inline-flex h-5 w-fit items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold ${tons[ton]}`}>{children}</span>;
}

/** Bloc de contenu, avec en-tête facultatif (icône, titre, description, action). */
export function Carte({
  titre,
  description,
  Icone,
  action,
  children,
  className = '',
  sansMarge = false,
}: {
  titre?: string;
  description?: string;
  Icone?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  sansMarge?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-md border bg-card shadow-xs ${className}`}>
      {(titre || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icone && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-white">
                <Icone className="size-4.5" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              {titre && <h2 className="text-base font-semibold leading-tight">{titre}</h2>}
              {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={sansMarge ? '' : 'p-4'}>{children}</div>
    </section>
  );
}

type BoutonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primaire' | 'secondaire' | 'fantome' | 'danger' | 'succes';
  taille?: 'sm' | 'md' | 'lg';
};

export function Bouton({ variante = 'primaire', taille = 'md', className = '', ...props }: BoutonProps) {
  const styles = {
    primaire: 'bg-primary text-white shadow-xs hover:bg-primary-hover',
    secondaire: 'border bg-card text-foreground hover:bg-muted',
    fantome: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    danger: 'bg-rose-600/10 text-rose-700 hover:bg-rose-600/20 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25',
    succes: 'bg-emerald-700 text-white shadow-xs hover:bg-emerald-800',
  }[variante];
  const tailles = { sm: 'h-8 gap-1.5 px-2.5 text-xs', md: 'h-9 gap-1.5 px-3 text-sm', lg: 'h-10 gap-2 px-5 text-sm' }[taille];
  return (
    <button
      {...props}
      className={`inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${tailles} ${styles} ${className}`}
    />
  );
}

export function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full min-w-0 rounded-md border bg-card px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-[var(--ring)]';

export function Modale({ ouvert, titre, onFermer, children, large = false }: { ouvert: boolean; titre: string; onFermer: () => void; children: React.ReactNode; large?: boolean }) {
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ouvert, onFermer]);
  if (!ouvert) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]" onMouseDown={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className={`apparition max-h-[90vh] w-full overflow-y-auto rounded-lg border bg-card p-6 shadow-2xl ${large ? 'max-w-4xl' : 'max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold leading-tight">{titre}</h3>
          <button type="button" aria-label="Fermer" onClick={onFermer} className="-m-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Menu ouvert par un bouton ; se ferme au clic extérieur, à Échap ou au choix d'une entrée. */
export function Menu({ bouton, children, className = '' }: { bouton: (ouvert: boolean, basculer: () => void) => React.ReactNode; children: (fermer: () => void) => React.ReactNode; className?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOuvert(false);
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    window.addEventListener('mousedown', dehors);
    window.addEventListener('keydown', echap);
    return () => {
      window.removeEventListener('mousedown', dehors);
      window.removeEventListener('keydown', echap);
    };
  }, [ouvert]);
  return (
    <div ref={ref} className="relative">
      {bouton(ouvert, () => setOuvert((o) => !o))}
      {ouvert && <div className={`apparition absolute z-[60] rounded-md border bg-card p-1 text-sm shadow-lg ${className}`}>{children(() => setOuvert(false))}</div>}
    </div>
  );
}

export const entreeMenuCls = 'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition hover:bg-muted [&_svg]:size-4 [&_svg]:shrink-0';

export function Onglets<T extends string>({ valeur, options, onChange, label }: { valeur: T; options: { valeur: T; libelle: string; Icone?: LucideIcon; n?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex w-fit max-w-full flex-wrap gap-1 rounded-md bg-muted p-1">
      {options.map(({ valeur: v, libelle, Icone, n }) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={valeur === v}
          onClick={() => onChange(v)}
          className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition ${valeur === v ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {Icone && <Icone className="size-3.5" aria-hidden />}
          {libelle}
          {n !== undefined && <span className="text-xs text-muted-foreground">{n}</span>}
        </button>
      ))}
    </div>
  );
}

const TEINTES = {
  violet: 'bg-violet-600/10 text-violet-700 dark:text-violet-300',
  ambre: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  vert: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300',
  rouge: 'bg-rose-600/10 text-rose-700 dark:text-rose-300',
  bleu: 'bg-blue-600/10 text-blue-700 dark:text-blue-300',
};
export type Teinte = keyof typeof TEINTES;

/** Courbe miniature (une série, sans axe) : l'évolution, pas les valeurs. */
function Miniature({ valeurs }: { valeurs: number[] }) {
  const max = Math.max(1, ...valeurs);
  const points = valeurs.map((v, i) => `${(i / Math.max(1, valeurs.length - 1)) * 100},${34 - (v / max) * 30}`).join(' ');
  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="hidden h-10 w-28 lg:block" aria-hidden>
      <polygon points={`0,36 ${points} 100,36`} fill="var(--viz-piste)" />
      <polyline points={points} fill="none" stroke="var(--viz-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export interface Stat {
  titre: string;
  valeur: string | number;
  sous?: string;
  Icone: LucideIcon;
  teinte: Teinte;
  evolution?: string;
  courbe?: number[];
  onClick?: () => void;
}

/** Chiffre et unité séparés : « 2,5 h » → 2,5 en grand, h en petit. */
function Valeur({ v }: { v: string | number }) {
  const [, nombre, unite] = String(v).match(/^([\d\s.,/]+)(.*)$/) ?? [null, String(v), ''];
  return (
    <span className="font-stats text-3xl font-extrabold tracking-tight">
      {nombre?.trim()}
      {unite?.trim() && <span className="ml-1 text-base font-medium text-muted-foreground">{unite.trim()}</span>}
    </span>
  );
}

export function GrilleStats({ stats, cols = 4 }: { stats: Stat[]; cols?: 2 | 4 }) {
  return (
    <div className="rounded-md border bg-primary-soft/40 p-1">
      <div className={`grid grid-cols-2 gap-1.5 ${cols === 4 ? 'xl:grid-cols-4' : ''}`}>
        {stats.map(({ titre, valeur, sous, Icone, teinte, evolution, courbe, onClick }) => {
          const contenu = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{titre}</p>
                  {sous && <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{sous}</p>}
                </div>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-md sm:size-11 ${TEINTES[teinte]}`}>
                  <Icone className="size-4 sm:size-5" aria-hidden />
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-x-3 sm:mt-4">
                <div>
                  <Valeur v={valeur} />
                  {evolution && <p className="mt-1 text-xs text-muted-foreground">{evolution}</p>}
                </div>
                {courbe && courbe.some((x) => x > 0) && <Miniature valeurs={courbe} />}
              </div>
            </>
          );
          const cls = 'flex flex-col justify-between rounded-md border bg-linear-to-t from-primary-soft/50 to-card to-60% p-3 text-left sm:p-4 shadow-xs dark:from-card dark:to-card';
          return onClick ? (
            <button key={titre} type="button" onClick={onClick} className={`${cls} transition hover:border-primary/40 hover:shadow-md active:scale-[0.99]`}>{contenu}</button>
          ) : (
            <div key={titre} className={cls}>{contenu}</div>
          );
        })}
      </div>
    </div>
  );
}

export function EntetePage({ titre, description, Icone, pastille, children }: { titre: string; description: string; Icone: LucideIcon; pastille?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary text-white shadow-sm">
          <Icone className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titre}</h1>
            {pastille}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Avatar({ nom, taille = 'md' }: { nom: string; taille?: 'sm' | 'md' | 'lg' }) {
  const initiales = nom.split(/\s+/).filter(Boolean).map((m) => m[0]).join('').slice(0, 2).toUpperCase();
  const t = { sm: 'size-8 text-xs', md: 'size-9 text-sm', lg: 'size-15 text-lg' }[taille];
  return <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-texte ring-1 ring-border ${t}`}>{initiales || '?'}</span>;
}

/** Pastille du véhicule A ou B, aux couleurs de la reconstitution 3D. */
export function LettreVehicule({ i, taille = 'sm' }: { i: number; taille?: 'sm' | 'lg' }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-md font-bold text-white ${i === 0 ? 'bg-vehA' : 'bg-vehB'} ${taille === 'lg' ? 'size-10 text-base' : 'size-5 text-[11px]'}`}>
      {String.fromCharCode(65 + i)}
    </span>
  );
}

export function Squelette({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
      <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {texte}
    </div>
  );
}

export function Erreur({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </div>
  );
}

export function Succes({ message }: { message: string }) {
  return (
    <div role="status" className="flex items-start gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </div>
  );
}

export function Vide({ titre, texte, children }: { titre: string; texte?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-6" aria-hidden />
      </span>
      <p className="font-semibold">{titre}</p>
      {texte && <p className="mt-1 text-sm text-muted-foreground">{texte}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { STATUTS } from '@/lib/format';
import type { Statut } from '@/lib/types';

export function StatutBadge({ statut }: { statut: Statut }) {
  const s = STATUTS[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.classes}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.point }} />
      {s.libelle}
    </span>
  );
}

export function Carte({ titre, action, children, className = '' }: { titre?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ${className}`}>
      {(titre || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {titre && <h2 className="text-sm font-semibold tracking-tight text-zinc-900">{titre}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type BoutonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primaire' | 'secondaire' | 'danger' | 'succes' };

export function Bouton({ variante = 'primaire', className = '', ...props }: BoutonProps) {
  const styles = {
    primaire: 'bg-brand-700 text-white hover:bg-brand-800',
    secondaire: 'bg-white text-zinc-800 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    succes: 'bg-emerald-600 text-white hover:bg-emerald-700',
  }[variante];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100';

export function Modale({ ouvert, titre, onFermer, children }: { ouvert: boolean; titre: string; onFermer: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ouvert, onFermer]);
  if (!ouvert) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-zinc-950/50 p-4" onMouseDown={onFermer}>
      <div role="dialog" aria-modal="true" aria-label={titre} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold">{titre}</h3>
        {children}
      </div>
    </div>
  );
}

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-zinc-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      {texte}
    </div>
  );
}

export function Erreur({ message }: { message: string }) {
  return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</div>;
}

export function Vide({ titre, texte }: { titre: string; texte?: string }) {
  return (
    <div className="py-14 text-center">
      <p className="font-semibold text-zinc-800">{titre}</p>
      {texte && <p className="mt-1 text-sm text-zinc-500">{texte}</p>}
    </div>
  );
}

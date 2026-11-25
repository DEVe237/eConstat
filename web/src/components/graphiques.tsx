'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { libelle, STATUTS } from '@/lib/format';

const AXE = { fontSize: 11, fill: 'var(--muted-foreground)' };
const BULLE = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--foreground)', fontSize: 12 };

/** Une seule série : le titre de la carte la nomme, pas de légende. */
export function CourbeJours({ donnees, hauteur = 260 }: { donnees: { libelle: string; n: number }[]; hauteur?: number }) {
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <AreaChart data={donnees} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--viz-grille)" />
        <XAxis dataKey="libelle" tick={AXE} axisLine={false} tickLine={false} interval={4} />
        <YAxis allowDecimals={false} tick={AXE} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }} contentStyle={BULLE} itemStyle={{ color: 'var(--foreground)' }} formatter={(v) => [v, 'Dossiers']} />
        <Area type="monotone" dataKey="n" stroke="var(--viz-1)" strokeWidth={2} fill="var(--viz-piste)" activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarresVerticales({ donnees, cle, nom, hauteur = 240, pas = 2 }: { donnees: Record<string, string | number>[]; cle: string; nom: string; hauteur?: number; pas?: number }) {
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={donnees} margin={{ left: -24, right: 4, top: 8 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="var(--viz-grille)" />
        <XAxis dataKey={cle} tick={AXE} axisLine={false} tickLine={false} interval={pas} />
        <YAxis allowDecimals={false} tick={AXE} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={BULLE} itemStyle={{ color: 'var(--foreground)' }} formatter={(v) => [v, nom]} />
        <Bar dataKey="n" fill="var(--viz-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarresHorizontales({ donnees }: { donnees: { valeur: string; n: number }[] }) {
  if (donnees.length === 0) return <p className="text-sm text-muted-foreground">Pas encore de données.</p>;
  const max = Math.max(...donnees.map((d) => d.n));
  return (
    <ul className="space-y-3">
      {donnees.map((d) => (
        <li key={d.valeur} title={`${libelle(d.valeur)} : ${d.n}`}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{libelle(d.valeur)}</span>
            <b className="font-stats">{d.n}</b>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--viz-piste)' }}>
            <div className="h-full rounded-full" style={{ width: `${(d.n / max) * 100}%`, background: 'var(--viz-1)' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Part de chaque statut dans le total : barre segmentée + légende chiffrée. */
export function Repartition({ totaux }: { totaux: { transmis: number; valide: number; conteste: number; total: number } }) {
  const parts = (['transmis', 'valide', 'conteste'] as const).map((k) => ({ k, n: totaux[k], ...STATUTS[k] }));
  if (!totaux.total) return <p className="text-sm text-muted-foreground">Pas encore de dossiers.</p>;
  return (
    <div>
      <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.libelle} : ${p.n}`).join(', ')}>
        {parts.filter((p) => p.n > 0).map((p) => <div key={p.k} title={`${p.libelle} : ${p.n}`} style={{ flexGrow: p.n, background: p.point }} />)}
      </div>
      <ul className="mt-4 space-y-2.5 text-sm">
        {parts.map((p) => (
          <li key={p.k} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: p.point }} />
            <span className="flex-1">{p.libelle}</span>
            <b className="font-stats">{p.n}</b>
            <span className="w-12 text-right text-xs text-muted-foreground">{Math.round((p.n / totaux.total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

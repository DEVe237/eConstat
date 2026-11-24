'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Carte, Chargement, Erreur } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateCourte, duree, libelle, STATUTS } from '@/lib/format';
import type { Statistiques } from '@/lib/types';

const CarteDossiers = dynamic(() => import('@/components/CarteDossiers'), { ssr: false, loading: () => <Chargement texte="Chargement de la carte…" /> });

const AXE = { fontSize: 11, fill: '#71717a' };
const GRILLE = '#f1f1f4';

function Kpi({ titre, valeur, sous, accent }: { titre: string; valeur: string | number; sous?: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        {titre}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight">{valeur}</p>
      {sous && <p className="mt-1 text-xs text-zinc-500">{sous}</p>}
    </div>
  );
}

function BarresHorizontales({ donnees }: { donnees: { valeur: string; n: number }[] }) {
  if (donnees.length === 0) return <p className="text-sm text-zinc-500">Pas encore de données.</p>;
  const max = Math.max(...donnees.map((d) => d.n));
  return (
    <ul className="space-y-3">
      {donnees.map((d) => (
        <li key={d.valeur}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-zinc-700">{libelle(d.valeur)}</span>
            <b>{d.n}</b>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-brand-50">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${(d.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function PageStatistiques() {
  const [s, setS] = useState<Statistiques | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const { autorite } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Statistiques réservées aux autorités : un assureur est renvoyé vers ses dossiers.
    if (!autorite) {
      router.replace('/dossiers');
      return;
    }
    api<Statistiques>('/dashboard/statistiques').then(setS).catch((e) => setErreur(e instanceof Error ? e.message : 'Chargement impossible'));
  }, [autorite, router]);

  // 30 derniers jours complets, y compris les jours sans dossier.
  const parJour = useMemo(() => {
    if (!s) return [];
    const map = new Map(s.parJour.map((j) => [j.jour, j.n]));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const cle = d.toISOString().slice(0, 10);
      return { jour: cle, libelle: dateCourte(cle), n: map.get(cle) ?? 0 };
    });
  }, [s]);

  const parHeure = useMemo(() => {
    if (!s) return [];
    const map = new Map(s.parHeure.map((h) => [h.heure, h.n]));
    return Array.from({ length: 24 }, (_, h) => ({ heure: `${h}h`, n: map.get(h) ?? 0 }));
  }, [s]);

  if (erreur) return <Erreur message={erreur} />;
  if (!s) return <Chargement />;

  const repartition = (['transmis', 'valide', 'conteste'] as const).map((k) => ({ nom: STATUTS[k].libelle, n: s.totaux[k], couleur: STATUTS[k].point })).filter((r) => r.n > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statistiques</h1>
        <p className="mt-1 text-sm text-zinc-500">Accidents déclarés, zones à risque et délais de traitement.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titre="Dossiers reçus" valeur={s.totaux.total} sous="Depuis la mise en service" accent="#7c3aed" />
        <Kpi titre="À traiter" valeur={s.totaux.transmis} sous="En attente d’un agent" accent={STATUTS.transmis.point} />
        <Kpi titre="Délai de traitement" valeur={duree(s.delaiTraitementHeures)} sous="Moyenne transmission → décision" accent={STATUTS.valide.point} />
        <Kpi
          titre="Délai de déclaration"
          valeur={s.delaiTransmissionMinutes != null ? duree(s.delaiTransmissionMinutes / 60) : '—'}
          sous="Moyenne accident → transmission"
          accent="#facc15"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Carte titre="Dossiers transmis — 30 derniers jours">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={parJour} margin={{ left: -20, right: 8 }}>
              <CartesianGrid vertical={false} stroke={GRILLE} />
              <XAxis dataKey="libelle" tick={AXE} axisLine={false} tickLine={false} interval={4} />
              <YAxis allowDecimals={false} tick={AXE} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f5f3ff' }} formatter={(v) => [v, 'Dossiers']} />
              <Bar dataKey="n" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Carte>
        <Carte titre="Répartition par statut">
          {repartition.length === 0 ? (
            <p className="text-sm text-zinc-500">Pas encore de dossiers.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={repartition} dataKey="n" nameKey="nom" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                    {repartition.map((r) => <Cell key={r.nom} fill={r.couleur} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1.5 text-sm">
                {repartition.map((r) => (
                  <li key={r.nom} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: r.couleur }} />{r.nom}</span>
                    <b>{r.n}</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Carte>
      </div>

      <Carte titre="Carte des accidents et zones à risque">
        <CarteDossiers points={s.points} zones={s.zonesARisque} />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Zones les plus accidentogènes (≈ 1 km)</p>
            {s.zonesARisque.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucun dossier géolocalisé.</p>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {s.zonesARisque.slice(0, 5).map((z, i) => (
                  <li key={`${z.lat},${z.lng}`} className="flex justify-between">
                    <a className="text-brand-700 hover:underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${z.lat}&mlon=${z.lng}#map=15/${z.lat}/${z.lng}`}>
                      {i + 1}. {z.lat.toFixed(2)}, {z.lng.toFixed(2)}
                    </a>
                    <b>{z.n} accident{z.n > 1 ? 's' : ''}</b>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="flex flex-wrap items-start gap-4 text-xs text-zinc-500">
            {(['transmis', 'valide', 'conteste'] as const).map((k) => (
              <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUTS[k].point }} />{STATUTS[k].libelle}</span>
            ))}
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-rose-500 bg-rose-500/15" />Zone à risque</span>
          </div>
        </div>
      </Carte>

      <div className="grid gap-6 lg:grid-cols-3">
        <Carte titre="Heure des accidents" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={parHeure} margin={{ left: -24, right: 4 }}>
              <CartesianGrid vertical={false} stroke={GRILLE} />
              <XAxis dataKey="heure" tick={AXE} axisLine={false} tickLine={false} interval={5} />
              <YAxis allowDecimals={false} tick={AXE} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f5f3ff' }} formatter={(v) => [v, 'Accidents']} />
              <Bar dataKey="n" fill="#e0692f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Carte>
        <Carte titre="Conditions météo"><BarresHorizontales donnees={s.meteo} /></Carte>
        <Carte titre="Zones de choc déclarées"><BarresHorizontales donnees={s.zonesChoc} /></Carte>
      </div>
    </div>
  );
}

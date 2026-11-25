'use client';

import { Activity, BarChart3, CarFront, Clock, CloudSun, Inbox, Map as IconeCarte, PieChart, Send, Timer } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BarresHorizontales, BarresVerticales, CourbeJours, Repartition } from '@/components/graphiques';
import { Carte, Chargement, EntetePage, Erreur, GrilleStats } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { duree, serie30Jours, STATUTS } from '@/lib/format';
import type { Statistiques } from '@/lib/types';

const CarteDossiers = dynamic(() => import('@/components/CarteDossiers'), { ssr: false, loading: () => <Chargement texte="Chargement de la carte…" /> });

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

  const parJour = useMemo(() => (s ? serie30Jours(s.parJour) : []), [s]);

  const parHeure = useMemo(() => {
    if (!s) return [];
    const map = new Map(s.parHeure.map((h) => [h.heure, h.n]));
    return Array.from({ length: 24 }, (_, h) => ({ heure: `${h}h`, n: map.get(h) ?? 0 }));
  }, [s]);

  if (erreur) return <Erreur message={erreur} />;
  if (!s) return <Chargement />;

  return (
    <div className="space-y-4">
      <EntetePage titre="Statistiques" Icone={BarChart3} description="Accidents déclarés, zones à risque et délais de traitement." />

      <GrilleStats
        stats={[
          { titre: 'Dossiers reçus', valeur: s.totaux.total, sous: 'Depuis la mise en service', Icone: Inbox, teinte: 'violet', courbe: parJour.map((j) => j.n) },
          { titre: 'À traiter', valeur: s.totaux.transmis, sous: 'En attente d’un agent', Icone: Clock, teinte: 'ambre', onClick: () => router.push('/dossiers') },
          { titre: 'Délai de traitement', valeur: duree(s.delaiTraitementHeures), sous: 'Moyenne transmission → décision', Icone: Timer, teinte: 'vert' },
          { titre: 'Délai de déclaration', valeur: s.delaiTransmissionMinutes != null ? duree(s.delaiTransmissionMinutes / 60) : '—', sous: 'Moyenne accident → transmission', Icone: Send, teinte: 'bleu' },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Carte className="xl:col-span-2" titre="Dossiers transmis" description="30 derniers jours" Icone={Activity}><CourbeJours donnees={parJour} /></Carte>
        <Carte titre="Répartition par statut" Icone={PieChart}><Repartition totaux={s.totaux} /></Carte>
      </div>

      <Carte titre="Carte des accidents et zones à risque" Icone={IconeCarte}>
        <CarteDossiers points={s.points} zones={s.zonesARisque} />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-texte">Zones les plus accidentogènes (≈ 1 km)</p>
            {s.zonesARisque.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun dossier géolocalisé.</p>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {s.zonesARisque.slice(0, 5).map((z, i) => (
                  <li key={`${z.lat},${z.lng}`} className="flex justify-between">
                    <a className="text-primary-texte hover:underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${z.lat}&mlon=${z.lng}#map=15/${z.lat}/${z.lng}`}>
                      {i + 1}. {z.lat.toFixed(2)}, {z.lng.toFixed(2)}
                    </a>
                    <b>{z.n} accident{z.n > 1 ? 's' : ''}</b>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="flex flex-wrap items-start gap-4 text-xs text-muted-foreground">
            {(['transmis', 'valide', 'conteste'] as const).map((k) => (
              <span key={k} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: STATUTS[k].point }} />{STATUTS[k].libelle}</span>
            ))}
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-rose-500 bg-rose-500/15" />Zone à risque</span>
          </div>
        </div>
      </Carte>

      <div className="grid gap-4 lg:grid-cols-3">
        <Carte titre="Heure des accidents" Icone={Clock}><BarresVerticales donnees={parHeure} cle="heure" nom="Accidents" pas={5} /></Carte>
        <Carte titre="Conditions météo" Icone={CloudSun}><BarresHorizontales donnees={s.meteo} /></Carte>
        <Carte titre="Zones de choc déclarées" Icone={CarFront}><BarresHorizontales donnees={s.zonesChoc} /></Carte>
      </div>
    </div>
  );
}

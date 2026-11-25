'use client';

import { Activity, BarChart3, CheckCircle2, Clock, FileText, Inbox, MapPin, PieChart, RefreshCw, Timer, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CourbeJours, Repartition } from '@/components/graphiques';
import { TableDossiers } from '@/components/TableDossiers';
import { Avatar, Bouton, Carte, Erreur, GrilleStats, Pastille, Squelette, Vide } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { duree, ROLES, serie30Jours } from '@/lib/format';
import type { ListeDossiers, Statistiques } from '@/lib/types';

function salutation() {
  const h = new Date().getHours();
  return h >= 5 && h < 18 ? 'Bonjour' : 'Bonsoir';
}

const s = (n: number) => (n > 1 ? 's' : '');

export default function PageTableauDeBord() {
  const { user, autorite } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [recents, setRecents] = useState<ListeDossiers | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const [st, liste] = await Promise.all([api<Statistiques>('/dashboard/statistiques'), api<ListeDossiers>('/dashboard/dossiers?statut=transmis&limite=6')]);
      setStats(st);
      setRecents(liste);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }, []);

  useEffect(() => {
    if (!autorite) router.replace('/dossiers');
    else charger();
  }, [autorite, router, charger]);

  if (!user) return null;
  if (erreur) {
    return (
      <div className="space-y-4">
        <Erreur message={erreur} />
        <Bouton variante="secondaire" onClick={charger}><RefreshCw /> Réessayer</Bouton>
      </div>
    );
  }
  if (!stats || !recents) {
    return (
      <div className="space-y-4" role="status" aria-label="Chargement">
        <Squelette className="h-44" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Squelette key={i} className="h-32" />)}</div>
        <Squelette className="h-80" />
      </div>
    );
  }

  const { totaux } = stats;
  const jours = serie30Jours(stats.parJour);
  const semaine = jours.slice(-7).reduce((t, j) => t + j.n, 0);
  const ecart = semaine - jours.slice(-14, -7).reduce((t, j) => t + j.n, 0);
  const n = totaux.transmis;
  const zone = stats.zonesARisque[0];
  const aujourdhui = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-md border bg-card p-5 shadow-xs sm:px-6">
        <div className="flex items-start gap-3">
          <Avatar nom={`${user.prenom} ${user.nom}`} taille="lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight tracking-tight">
              {salutation()}, <span className="text-primary-texte">{user.prenom} {user.nom}</span> !
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Pastille ton="primaire">{ROLES[user.role] ?? user.role}</Pastille>
              {user.unite && <span>{user.unite} •</span>}
              <span className="inline-block first-letter:uppercase">{aujourdhui}</span>
            </div>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          {n > 0 ? <>Vous avez <b className="text-primary-texte">{n} dossier{s(n)}</b> à traiter.</> : 'Aucun dossier en attente.'}{' '}
          <b className="text-primary-texte">{semaine} constat{s(semaine)}</b> reçu{s(semaine)} ces 7 derniers jours.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Bouton taille="lg" onClick={() => router.push('/dossiers')}>
            <FileText /> Traiter les dossiers {n > 0 && <span className="rounded-full bg-white/25 px-1.5 text-[11px] font-bold">{n}</span>}
          </Bouton>
          <Bouton taille="lg" variante="secondaire" onClick={() => router.push('/statistiques')}><BarChart3 /> Statistiques</Bouton>
          {user.role === 'administrateur' && <Bouton taille="lg" variante="secondaire" onClick={() => router.push('/utilisateurs')}><Users /> Comptes</Bouton>}
        </div>
        <img src="/embleme.png" alt="" className="pointer-events-none absolute right-6 top-1/2 hidden size-40 -translate-y-1/2 object-contain opacity-80 lg:block" />
      </section>

      <GrilleStats
        stats={[
          { titre: 'À traiter', valeur: n, sous: 'En attente d’une décision', Icone: Clock, teinte: 'ambre', onClick: () => router.push('/dossiers') },
          {
            titre: 'Dossiers reçus',
            valeur: totaux.total,
            sous: 'Depuis la mise en service',
            Icone: Inbox,
            teinte: 'violet',
            courbe: jours.slice(-14).map((j) => j.n),
            evolution: ecart === 0 ? 'Stable sur 7 jours' : `${ecart > 0 ? '+' : '−'}${Math.abs(ecart)} sur 7 jours`,
            onClick: () => router.push('/dossiers?statut=tous'),
          },
          {
            titre: 'Décisions rendues',
            valeur: totaux.valide + totaux.conteste,
            sous: `${totaux.valide} validé${s(totaux.valide)} · ${totaux.conteste} contesté${s(totaux.conteste)}`,
            Icone: CheckCircle2,
            teinte: 'vert',
            onClick: () => router.push('/dossiers?statut=valide'),
          },
          { titre: 'Délai de traitement', valeur: duree(stats.delaiTraitementHeures), sous: 'Moyenne transmission → décision', Icone: Timer, teinte: 'bleu' },
        ]}
      />

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Carte
          className="xl:col-span-2"
          titre="Derniers dossiers à traiter"
          description="Les constats les plus récents transmis par les conducteurs"
          Icone={FileText}
          action={<Link href="/dossiers" className="text-sm font-medium text-primary-texte hover:underline">Voir tout</Link>}
        >
          {recents.items.length === 0 ? <Vide titre="Aucun dossier en attente" texte="Les nouveaux constats apparaîtront ici." /> : <TableDossiers items={recents.items} compact />}
        </Carte>
        <div className="space-y-4">
          <Carte titre="Répartition par statut" Icone={PieChart}><Repartition totaux={totaux} /></Carte>
          <Carte titre="Zone la plus accidentogène" Icone={MapPin}>
            {zone ? (
              <>
                <p className="font-stats text-3xl font-extrabold">{zone.n}<span className="ml-1 text-base font-medium text-muted-foreground">accident{s(zone.n)}</span></p>
                <p className="mt-1 text-sm text-muted-foreground">Autour de {zone.lat.toFixed(2)}, {zone.lng.toFixed(2)} (≈ 1 km)</p>
                <Link href="/statistiques" className="mt-3 inline-block text-sm font-medium text-primary-texte hover:underline">Voir la carte</Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun dossier géolocalisé.</p>
            )}
          </Carte>
        </div>
      </div>

      <Carte titre="Dossiers transmis" description="30 derniers jours" Icone={Activity}><CourbeJours donnees={jours} hauteur={300} /></Carte>
    </div>
  );
}

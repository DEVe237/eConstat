'use client';

import { CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, FileText, Layers, MapPin, RefreshCw, RotateCcw, Search, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { TableDossiers } from '@/components/TableDossiers';
import { Bouton, Carte, EntetePage, Erreur, inputCls, Onglets, Pastille, Squelette, Vide } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ListeDossiers, Statut } from '@/lib/types';

const ONGLETS: { valeur: '' | Statut; libelle: string; Icone: LucideIcon }[] = [
  { valeur: 'transmis', libelle: 'À traiter', Icone: Clock },
  { valeur: 'valide', libelle: 'Validés', Icone: CheckCircle2 },
  { valeur: 'conteste', libelle: 'Contestés', Icone: TriangleAlert },
  { valeur: '', libelle: 'Tous', Icone: Layers },
];

interface Filtres {
  statut: '' | Statut;
  q: string;
  du: string;
  au: string;
  lat: string;
  lng: string;
  rayonKm: string;
  page: number;
  limite: number;
}

const FILTRES_INITIAUX: Filtres = { statut: 'transmis', q: '', du: '', au: '', lat: '', lng: '', rayonKm: '', page: 1, limite: 15 };

/** Onglet demandé par l’adresse (?statut=valide, ?statut=tous), sinon « À traiter ». */
function statutInitial(autorite: boolean): '' | Statut {
  const demande = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('statut');
  if (demande === 'valide' || demande === 'conteste' || demande === 'transmis') return demande;
  // Les assureurs consultent tous les dossiers qui leur ont été transmis, quel que soit leur statut.
  return demande === 'tous' || !autorite ? '' : 'transmis';
}

export default function PageDossiers() {
  const { autorite } = useAuth();
  const [filtres, setFiltres] = useState<Filtres>(() => ({ ...FILTRES_INITIAUX, statut: statutInitial(autorite) }));
  const [recherche, setRecherche] = useState('');
  const [zoneOuverte, setZoneOuverte] = useState(false);
  const [donnees, setDonnees] = useState<ListeDossiers | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async (f: Filtres) => {
    setChargement(true);
    setErreur(null);
    const p = new URLSearchParams({ page: String(f.page), limite: String(f.limite) });
    if (f.statut) p.set('statut', f.statut);
    if (f.q) p.set('q', f.q);
    if (f.du) p.set('du', new Date(`${f.du}T00:00:00`).toISOString());
    if (f.au) p.set('au', new Date(`${f.au}T23:59:59`).toISOString());
    if (f.lat && f.lng && f.rayonKm) {
      p.set('lat', f.lat);
      p.set('lng', f.lng);
      p.set('rayonKm', f.rayonKm);
    }
    try {
      setDonnees(await api<ListeDossiers>(`/dashboard/dossiers?${p}`));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger(filtres);
  }, [filtres, charger]);

  // Recherche avec un léger délai pour ne pas appeler l'API à chaque touche.
  useEffect(() => {
    const t = setTimeout(() => setFiltres((f) => (f.q === recherche.trim() ? f : { ...f, q: recherche.trim(), page: 1 })), 350);
    return () => clearTimeout(t);
  }, [recherche]);

  const maj = (partiel: Partial<Filtres>) => setFiltres((f) => ({ ...f, ...partiel, page: partiel.page ?? 1 }));
  const pages = donnees ? Math.max(1, Math.ceil(donnees.total / donnees.limite)) : 1;

  const filtre = !!(filtres.q || filtres.du || filtres.au || filtres.lat || filtres.lng || filtres.rayonKm);
  const effacer = () => {
    setRecherche('');
    maj({ q: '', du: '', au: '', lat: '', lng: '', rayonKm: '' });
  };

  return (
    <div className="space-y-4">
      <EntetePage
        titre="Dossiers de constat"
        Icone={FileText}
        description={autorite ? 'Constats transmis par les conducteurs via l’application mobile.' : 'Constats transmis à votre compagnie par les autorités.'}
        pastille={donnees && <Pastille ton="primaire">{donnees.total} dossier{donnees.total > 1 ? 's' : ''}</Pastille>}
      >
        <Bouton variante="secondaire" onClick={() => charger(filtres)}><RefreshCw className={chargement ? 'animate-spin' : ''} /> Actualiser</Bouton>
      </EntetePage>

      <Onglets label="Statut des dossiers" valeur={filtres.statut} options={ONGLETS} onChange={(statut) => maj({ statut })} />

      {erreur && <Erreur message={erreur} />}

      <Carte>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input className={`${inputCls} h-9 pl-9`} aria-label="Rechercher" placeholder="Plaque, conducteur ou n° de dossier (#02EC6023)" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </div>
          <input className={`${inputCls} h-9 max-w-40`} type="date" aria-label="Du" value={filtres.du} onChange={(e) => maj({ du: e.target.value })} />
          <input className={`${inputCls} h-9 max-w-40`} type="date" aria-label="Au" value={filtres.au} onChange={(e) => maj({ au: e.target.value })} />
          <Bouton variante="secondaire" aria-expanded={zoneOuverte} className={zoneOuverte ? '' : 'border-dashed'} onClick={() => setZoneOuverte((z) => !z)}><MapPin /> Zone</Bouton>
          {filtre && <Bouton variante="fantome" onClick={effacer}><RotateCcw /> Réinitialiser</Bouton>}
        </div>
        {zoneOuverte && (
          <div className="mb-4 grid gap-2 rounded-md bg-muted/50 p-3 sm:grid-cols-3">
            <input className={inputCls} aria-label="Latitude" placeholder="Latitude (ex. 3.8667)" inputMode="decimal" value={filtres.lat} onChange={(e) => maj({ lat: e.target.value })} />
            <input className={inputCls} aria-label="Longitude" placeholder="Longitude (ex. 11.5167)" inputMode="decimal" value={filtres.lng} onChange={(e) => maj({ lng: e.target.value })} />
            <input className={inputCls} aria-label="Rayon en kilomètres" placeholder="Rayon (km)" inputMode="decimal" value={filtres.rayonKm} onChange={(e) => maj({ rayonKm: e.target.value })} />
          </div>
        )}

        {chargement && !donnees ? (
          <div className="space-y-2" role="status" aria-label="Chargement">{[0, 1, 2, 3, 4].map((i) => <Squelette key={i} className="h-14" />)}</div>
        ) : !donnees || donnees.items.length === 0 ? (
          <Vide titre="Aucun dossier" texte={filtre ? 'Aucun constat ne correspond à ces filtres.' : 'Aucun constat dans cette catégorie.'}>
            {filtre && <Bouton variante="secondaire" onClick={effacer}><RotateCcw /> Réinitialiser les filtres</Bouton>}
          </Vide>
        ) : (
          <TableDossiers items={donnees.items} attenue={chargement} />
        )}

        {donnees && donnees.total > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{donnees.total} dossier{donnees.total > 1 ? 's' : ''}</span>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 font-medium">
                Lignes par page
                <select className={`${inputCls} h-8 py-0`} value={filtres.limite} onChange={(e) => maj({ limite: Number(e.target.value) })}>
                  {[10, 15, 30, 50].map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <span className="font-medium">Page {filtres.page} sur {pages}</span>
              <div className="flex gap-1.5">
                <Bouton taille="sm" variante="secondaire" aria-label="Première page" disabled={filtres.page <= 1} onClick={() => maj({ page: 1 })}><ChevronsLeft /></Bouton>
                <Bouton taille="sm" variante="secondaire" aria-label="Page précédente" disabled={filtres.page <= 1} onClick={() => maj({ page: filtres.page - 1 })}><ChevronLeft /></Bouton>
                <Bouton taille="sm" variante="secondaire" aria-label="Page suivante" disabled={filtres.page >= pages} onClick={() => maj({ page: filtres.page + 1 })}><ChevronRight /></Bouton>
                <Bouton taille="sm" variante="secondaire" aria-label="Dernière page" disabled={filtres.page >= pages} onClick={() => maj({ page: pages })}><ChevronsRight /></Bouton>
              </div>
            </div>
          </div>
        )}
      </Carte>
    </div>
  );
}

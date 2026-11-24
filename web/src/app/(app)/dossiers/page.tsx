'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bouton, Carte, Chargement, Erreur, inputCls, StatutBadge, Vide } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateHeure, libelle } from '@/lib/format';
import type { ListeDossiers, Statut } from '@/lib/types';

const ONGLETS: { valeur: '' | Statut; libelle: string }[] = [
  { valeur: 'transmis', libelle: 'À traiter' },
  { valeur: 'valide', libelle: 'Validés' },
  { valeur: 'conteste', libelle: 'Contestés' },
  { valeur: '', libelle: 'Tous' },
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
}

const FILTRES_INITIAUX: Filtres = { statut: 'transmis', q: '', du: '', au: '', lat: '', lng: '', rayonKm: '', page: 1 };

export default function PageDossiers() {
  const router = useRouter();
  const { autorite } = useAuth();
  // Les assureurs consultent tous les dossiers qui leur ont été transmis, quel que soit leur statut.
  const [filtres, setFiltres] = useState<Filtres>(() => ({ ...FILTRES_INITIAUX, statut: autorite ? 'transmis' : '' }));
  const [recherche, setRecherche] = useState('');
  const [zoneOuverte, setZoneOuverte] = useState(false);
  const [donnees, setDonnees] = useState<ListeDossiers | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async (f: Filtres) => {
    setChargement(true);
    setErreur(null);
    const p = new URLSearchParams({ page: String(f.page), limite: '15' });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dossiers de constat</h1>
          <p className="mt-1 text-sm text-zinc-500">{autorite ? 'Constats transmis par les conducteurs via l’application mobile.' : 'Constats transmis à votre compagnie par les autorités.'}</p>
        </div>
        <Bouton variante="secondaire" onClick={() => charger(filtres)}>Actualiser</Bouton>
      </div>

      <div className="flex flex-wrap gap-2">
        {ONGLETS.map((o) => (
          <button
            key={o.libelle}
            onClick={() => maj({ statut: o.valeur })}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filtres.statut === o.valeur ? 'bg-brand-700 text-white shadow' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'}`}
          >
            {o.libelle}
          </button>
        ))}
      </div>

      <Carte>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <input className={inputCls} placeholder="Rechercher : plaque, conducteur ou n° de dossier (#02EC6023)" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          <input className={inputCls} type="date" aria-label="Du" value={filtres.du} onChange={(e) => maj({ du: e.target.value })} />
          <input className={inputCls} type="date" aria-label="Au" value={filtres.au} onChange={(e) => maj({ au: e.target.value })} />
          <Bouton variante="secondaire" onClick={() => setZoneOuverte((z) => !z)}>{zoneOuverte ? 'Masquer la zone' : 'Filtrer par zone'}</Bouton>
        </div>
        {zoneOuverte && (
          <div className="mt-3 grid gap-3 border-t border-zinc-100 pt-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <input className={inputCls} placeholder="Latitude (ex. 3.8667)" inputMode="decimal" value={filtres.lat} onChange={(e) => maj({ lat: e.target.value })} />
            <input className={inputCls} placeholder="Longitude (ex. 11.5167)" inputMode="decimal" value={filtres.lng} onChange={(e) => maj({ lng: e.target.value })} />
            <input className={inputCls} placeholder="Rayon (km)" inputMode="decimal" value={filtres.rayonKm} onChange={(e) => maj({ rayonKm: e.target.value })} />
            <Bouton variante="secondaire" onClick={() => maj({ lat: '', lng: '', rayonKm: '' })}>Effacer</Bouton>
          </div>
        )}
      </Carte>

      {erreur && <Erreur message={erreur} />}

      <Carte className="overflow-hidden p-0">
        {chargement && !donnees ? (
          <div className="px-5"><Chargement /></div>
        ) : !donnees || donnees.items.length === 0 ? (
          <Vide titre="Aucun dossier" texte="Aucun constat ne correspond à ces filtres." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Dossier</th>
                  <th className="px-5 py-3 font-semibold">Accident</th>
                  <th className="px-5 py-3 font-semibold">Véhicules</th>
                  <th className="px-5 py-3 font-semibold">Météo</th>
                  <th className="px-5 py-3 font-semibold">Transmis le</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-zinc-100 ${chargement ? 'opacity-60' : ''}`}>
                {donnees.items.map((d) => (
                  <tr key={d.id} className="cursor-pointer transition hover:bg-brand-50/60" onClick={() => router.push(`/dossiers/${d.id}`)}>
                    <td className="px-5 py-4">
                      <Link href={`/dossiers/${d.id}`} className="font-bold text-brand-800" onClick={(e) => e.stopPropagation()}>{d.numero}</Link>
                    </td>
                    <td className="px-5 py-4 text-zinc-700">{dateHeure(d.dateAccident)}</td>
                    <td className="px-5 py-4">
                      {d.vehicules.length === 0 ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        <div className="space-y-1">
                          {d.vehicules.map((v, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white ${i === 0 ? 'bg-vehA' : 'bg-vehB'}`}>{String.fromCharCode(65 + i)}</span>
                              <span className="font-medium">{v.plaque}</span>
                              <span className="text-zinc-500">{v.conducteurNom}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-zinc-600">{libelle(d.conditionsMeteo)}</td>
                    <td className="px-5 py-4 text-zinc-600">{dateHeure(d.dateTransmission)}</td>
                    <td className="px-5 py-4"><StatutBadge statut={d.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {donnees && donnees.total > 0 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-sm text-zinc-500">
            <span>{donnees.total} dossier{donnees.total > 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              <Bouton variante="secondaire" className="px-3 py-1.5" disabled={filtres.page <= 1} onClick={() => maj({ page: filtres.page - 1 })}>Précédent</Bouton>
              <span>Page {filtres.page} / {pages}</span>
              <Bouton variante="secondaire" className="px-3 py-1.5" disabled={filtres.page >= pages} onClick={() => maj({ page: filtres.page + 1 })}>Suivant</Bouton>
            </div>
          </div>
        )}
      </Carte>
    </div>
  );
}

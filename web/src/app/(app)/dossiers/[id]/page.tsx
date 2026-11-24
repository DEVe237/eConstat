'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bouton, Carte, Champ, Chargement, Erreur, inputCls, Modale, StatutBadge } from '@/components/ui';
import { api, API, telecharger, viaApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORIES, dateHeure, DOCUMENTS, libelle } from '@/lib/format';
import type { AnalyseIA, DossierDetail, Evenement, Media, Responsabilite } from '@/lib/types';

type Action = 'valider' | 'contester' | 'completer';

const ACTIONS: Record<Action, { titre: string; bouton: string; variante: 'succes' | 'danger' | 'primaire'; placeholder: string; obligatoire: boolean }> = {
  valider: { titre: 'Valider le constat : conclusion', bouton: 'Valider avec cette conclusion', variante: 'succes', placeholder: 'Justification de la conclusion (obligatoire) : éléments du dossier, photos, témoignages…', obligatoire: true },
  contester: { titre: 'Contester le constat', bouton: 'Contester', variante: 'danger', placeholder: 'Motif de la contestation (obligatoire)', obligatoire: true },
  completer: { titre: 'Ajouter un complément', bouton: 'Enregistrer', variante: 'primaire', placeholder: 'Information complémentaire, constat de l’agent sur place…', obligatoire: true },
};

const EVT: Record<Evenement['type'], { libelle: string; couleur: string }> = {
  creation: { libelle: 'Dossier créé par le conducteur', couleur: 'bg-zinc-400' },
  transmission: { libelle: 'Transmis aux autorités', couleur: 'bg-brand-600' },
  validation: { libelle: 'Constat validé', couleur: 'bg-emerald-500' },
  contestation: { libelle: 'Constat contesté', couleur: 'bg-rose-500' },
  complement: { libelle: 'Complément ajouté', couleur: 'bg-amber-500' },
  temoignage: { libelle: 'Témoignage recueilli', couleur: 'bg-sky-500' },
  envoi_assureur: { libelle: 'Transmis à l’assureur', couleur: 'bg-indigo-500' },
};

const CONCLUSIONS: { valeur: Responsabilite; titre: string; detail: string; classes: string }[] = [
  { valeur: 'A', titre: 'Conducteur A responsable', detail: 'A 100 % · B 0 %', classes: 'peer-checked:border-vehA peer-checked:bg-violet-50' },
  { valeur: 'B', titre: 'Conducteur B responsable', detail: 'A 0 % · B 100 %', classes: 'peer-checked:border-vehB peer-checked:bg-orange-50' },
  { valeur: 'partagee', titre: 'Responsabilité partagée', detail: 'Répartition à préciser', classes: 'peer-checked:border-brand-600 peer-checked:bg-brand-50' },
  { valeur: 'indeterminee', titre: 'Indéterminée', detail: 'Éléments insuffisants', classes: 'peer-checked:border-zinc-500 peer-checked:bg-zinc-50' },
];

function Vignette({ m, onOuvrir }: { m: Media; onOuvrir: (url: string) => void }) {
  const titre = `${CATEGORIES[m.categorie] ?? 'Photo'}${m.conducteur ? ` ${m.conducteur}` : ''}`;
  if (m.type === 'video') {
    return (
      <div className="relative">
        <video src={viaApi(m.url)} controls className="aspect-square w-full rounded-xl bg-black object-cover" />
        <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
          {titre}{m.dureeSecondes ? ` · ${Math.round(m.dureeSecondes)} s` : ''}
        </span>
      </div>
    );
  }
  return (
    <button onClick={() => onOuvrir(viaApi(m.url))} className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-100" title={titre}>
      <img src={viaApi(m.url)} alt={titre} className="h-full w-full object-cover transition group-hover:scale-105" />
      <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{titre}</span>
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{dateHeure(m.horodatage)}</span>
    </button>
  );
}

function CarteAnalyseIA({ a, autorite, enCours, onLancer }: { a: AnalyseIA | null; autorite: boolean; enCours: boolean; onLancer: () => void }) {
  const r = a?.statut === 'terminee' ? a.resultat : null;
  return (
    <Carte
      titre="Analyse IA des photos"
      action={autorite ? <Bouton variante="secondaire" className="px-3 py-1.5 text-xs" onClick={onLancer} disabled={enCours}>{enCours ? 'Analyse…' : a ? 'Relancer' : 'Analyser'}</Bouton> : undefined}
    >
      {!a && <p className="text-sm text-zinc-500">Aucune analyse. L’IA lit les plaques, les dégâts, la zone de choc, la route et la météo sur les photos.</p>}
      {a && a.statut !== 'terminee' && (
        <p className={`rounded-lg p-3 text-sm ${a.statut === 'indisponible' ? 'bg-zinc-50 text-zinc-600' : 'bg-rose-50 text-rose-800'}`}>
          {a.statut === 'indisponible' ? 'Analyse IA non configurée sur ce serveur (clé d’API absente).' : `Échec de l’analyse : ${a.erreur ?? 'erreur inconnue'}`}
        </p>
      )}
      {r && (
        <div className="space-y-3 text-sm">
          <p className="rounded-lg bg-brand-50 p-3 text-zinc-800">{r.resume}</p>
          <dl className="divide-y divide-zinc-100">
            <Ligne k="Collision" v={`${libelle(r.typeCollision)}${r.angleImpactDeg >= 0 ? ` · ${r.angleImpactDeg}°` : ''}`} />
            <Ligne k="Route" v={libelle(r.typeRoute)} />
            <Ligne k="Météo apparente" v={libelle(r.conditionsMeteo)} />
            {r.vehicules.map((v) => (
              <Ligne key={v.conducteur} k={`Véhicule ${v.conducteur}`} v={<span>{v.plaque || 'plaque illisible'} · {v.marque} {v.couleur}<br /><span className="text-xs font-normal text-zinc-500">Choc {libelle(v.zoneChoc).toLowerCase()} · {v.degats} ({v.gravite})</span></span>} />
            ))}
          </dl>
          <div>
            <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>Confiance</span><span>{Math.round(r.confiance * 100)} %</span></div>
            <div className="h-1.5 rounded-full bg-zinc-100"><div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${Math.round(r.confiance * 100)}%` }} /></div>
          </div>
          <p className="text-xs text-zinc-500">{a!.photosAnalysees} photo(s) · {dateHeure(a!.dateCreation)} · indicatif, sans valeur probante.</p>
        </div>
      )}
    </Carte>
  );
}

function Ligne({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-zinc-500">{k}</dt>
      <dd className="text-right font-medium text-zinc-900">{v}</dd>
    </div>
  );
}

export default function PageDossier() {
  const { id } = useParams<{ id: string }>();
  const { autorite } = useAuth();
  const [d, setD] = useState<DossierDetail | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreurAction, setErreurAction] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [telechargement, setTelechargement] = useState<string | null>(null);
  const [vue3d, setVue3d] = useState<'video' | 'interactive'>('video');
  const [modaleTemoin, setModaleTemoin] = useState(false);
  const [temoin, setTemoin] = useState({ temoinNom: '', temoinTelephone: '', recit: '' });
  const [modaleAssureur, setModaleAssureur] = useState(false);
  const [compagnies, setCompagnies] = useState<string[] | null>(null);
  const [compagnie, setCompagnie] = useState('');
  const [responsabilite, setResponsabilite] = useState<Responsabilite | null>(null);
  const [partA, setPartA] = useState(50);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);

  const charger = useCallback(async () => {
    try {
      setD(await api<DossierDetail>(`/dashboard/dossiers/${id}`));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }, [id]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Tant qu'une génération 3D est en cours, on rafraîchit le dossier.
  const sim = d?.simulations3d[0];
  useEffect(() => {
    if (!sim || (sim.statut !== 'en_attente' && sim.statut !== 'en_cours')) return;
    const t = setInterval(charger, 4000);
    return () => clearInterval(t);
  }, [sim, charger]);

  async function executer(appel: () => Promise<DossierDetail>, fermer: () => void) {
    setEnvoi(true);
    setErreurAction(null);
    try {
      setD(await appel());
      fermer();
    } catch (e) {
      setErreurAction(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setEnvoi(false);
    }
  }

  function confirmer() {
    if (!action) return;
    if (action === 'valider' && !responsabilite) return setErreurAction('Choisissez une conclusion : qui est responsable de l’accident ?');
    if (ACTIONS[action].obligatoire && !commentaire.trim()) {
      return setErreurAction(action === 'valider' ? 'La justification de la conclusion est obligatoire.' : 'Ce champ est obligatoire.');
    }
    const json: Record<string, unknown> = commentaire.trim() ? { commentaire: commentaire.trim() } : {};
    if (action === 'valider') {
      json.responsabilite = responsabilite;
      if (responsabilite === 'partagee') json.partResponsabiliteA = partA;
    }
    executer(
      () => api<DossierDetail>(`/dashboard/dossiers/${id}/${action}`, { method: 'POST', json }),
      () => {
        setAction(null);
        setCommentaire('');
        setResponsabilite(null);
        setPartA(50);
      },
    );
  }

  function enregistrerTemoin(e: React.FormEvent) {
    e.preventDefault();
    const json = { temoinNom: temoin.temoinNom.trim(), recit: temoin.recit.trim(), ...(temoin.temoinTelephone.trim() ? { temoinTelephone: temoin.temoinTelephone.trim() } : {}) };
    executer(
      () => api<DossierDetail>(`/dashboard/dossiers/${id}/temoignages`, { method: 'POST', json }),
      () => {
        setModaleTemoin(false);
        setTemoin({ temoinNom: '', temoinTelephone: '', recit: '' });
      },
    );
  }

  async function ouvrirAssureur() {
    setErreurAction(null);
    setModaleAssureur(true);
    try {
      const liste = await api<string[]>('/dashboard/assureurs');
      setCompagnies(liste);
      setCompagnie((c) => c || liste.find((x) => !d?.transmissionsAssureurs.some((t) => t.compagnie === x)) || '');
    } catch (e) {
      setErreurAction(e instanceof Error ? e.message : 'Chargement des compagnies impossible');
    }
  }

  function transmettreAssureur() {
    if (!compagnie) return setErreurAction('Choisissez une compagnie.');
    executer(() => api<DossierDetail>(`/dashboard/dossiers/${id}/transmettre-assureur`, { method: 'POST', json: { compagnie } }), () => setModaleAssureur(false));
  }

  async function telechargerFichier(chemin: string, nom: string) {
    setTelechargement(chemin);
    try {
      await telecharger(chemin, nom);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Téléchargement impossible');
    } finally {
      setTelechargement(null);
    }
  }

  async function analyserIA() {
    setAnalyseEnCours(true);
    try {
      await api(`/dossiers/${id}/analyse-ia`, { method: 'POST' });
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Analyse impossible');
    } finally {
      setAnalyseEnCours(false);
    }
  }

  async function generer3d() {
    try {
      await api(`/dossiers/${id}/simulation3d`, { method: 'POST' });
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Génération impossible');
    }
  }

  if (erreur && !d) return <Erreur message={erreur} />;
  if (!d) return <Chargement />;

  const photos = d.medias.filter((m) => m.type === 'photo');
  const videos = d.medias.filter((m) => m.type === 'video');
  const scene = d.medias.filter((m) => !(DOCUMENTS as readonly string[]).includes(m.categorie));
  const ordreScene = ['vue_ensemble', 'plaque', 'vehicule', 'video_tour', 'libre'];
  scene.sort((a, b) => ordreScene.indexOf(a.categorie) - ordreScene.indexOf(b.categorie) || (a.conducteur ?? '').localeCompare(b.conducteur ?? ''));
  const nomConducteur = (c: 'A' | 'B') => d.vehiculesImpliques[c === 'A' ? 0 : 1]?.conducteurNom;
  const videoPrete = sim?.statut === 'termine' && sim.urlAnimation;
  const mode3d = videoPrete && vue3d === 'video' ? 'video' : 'interactive';
  const num = d.numero.slice(1);

  return (
    <div className="space-y-6">
      <Link href="/dossiers" className="text-sm font-medium text-brand-700 hover:underline">← Tous les dossiers</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Dossier {d.numero}</h1>
            <StatutBadge statut={d.statut} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">Accident du {dateHeure(d.dateAccident)} · transmis le {dateHeure(d.dateTransmission)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Bouton variante="secondaire" onClick={() => telechargerFichier(`/dashboard/dossiers/${id}/export.pdf`, `constat-${num}.pdf`)} disabled={telechargement !== null}>
            {telechargement?.endsWith('.pdf') ? 'Export…' : 'Exporter en PDF'}
          </Bouton>
          {autorite && (
            <>
              <Bouton variante="secondaire" onClick={ouvrirAssureur}>Transmettre à l’assureur</Bouton>
              <Bouton variante="secondaire" onClick={() => { setErreurAction(null); setModaleTemoin(true); }}>Témoignage</Bouton>
              <Bouton variante="secondaire" onClick={() => setAction('completer')}>Compléter</Bouton>
              {d.statut !== 'conteste' && <Bouton variante="danger" onClick={() => setAction('contester')}>Contester</Bouton>}
              {d.statut !== 'valide' && <Bouton variante="succes" onClick={() => setAction('valider')}>Valider</Bouton>}
            </>
          )}
        </div>
      </div>

      {erreur && <Erreur message={erreur} />}

      {d.agentTraitant && (
        <div className={`rounded-2xl border px-5 py-4 text-sm ${d.statut === 'valide' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
          {d.statut === 'valide' && d.conclusion && (
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="text-base font-bold">Conclusion : {d.conclusion.libelle}</span>
              {d.conclusion.partResponsabiliteA !== null && (
                <span className="flex h-2.5 w-48 overflow-hidden rounded-full bg-white ring-1 ring-emerald-200" title={`A ${d.conclusion.partResponsabiliteA} % · B ${100 - d.conclusion.partResponsabiliteA} %`}>
                  <span className="bg-vehA" style={{ width: `${d.conclusion.partResponsabiliteA}%` }} />
                  <span className="flex-1 bg-vehB" />
                </span>
              )}
            </div>
          )}
          <b>{d.statut === 'valide' ? 'Validé' : 'Contesté'}</b> par {d.agentTraitant.nom}
          {d.agentTraitant.matricule ? ` (matricule ${d.agentTraitant.matricule})` : ''} le {dateHeure(d.dateTraitement)}
          {d.commentaireAgent && <p className="mt-1 whitespace-pre-line">« {d.commentaireAgent} »</p>}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Carte
            titre="Reconstitution 3D"
            action={
              <div className="flex items-center gap-2">
                {videoPrete && (
                  <div className="flex rounded-lg bg-zinc-100 p-0.5 text-xs font-semibold">
                    {(['video', 'interactive'] as const).map((m) => (
                      <button key={m} onClick={() => setVue3d(m)} className={`rounded-md px-3 py-1.5 ${vue3d === m ? 'bg-white shadow' : 'text-zinc-500'}`}>
                        {m === 'video' ? 'Vidéo' : 'Interactive'}
                      </button>
                    ))}
                  </div>
                )}
                {autorite && (
                  <Bouton variante="secondaire" className="px-3 py-1.5 text-xs" onClick={generer3d} disabled={sim?.statut === 'en_attente' || sim?.statut === 'en_cours'}>
                    {sim ? 'Régénérer la vidéo' : 'Générer la vidéo'}
                  </Bouton>
                )}
              </div>
            }
          >
            <div className="aspect-video overflow-hidden rounded-xl bg-zinc-900">
              {mode3d === 'video' && sim?.urlAnimation ? (
                <video src={sim.urlAnimation.startsWith('/') ? viaApi(sim.urlAnimation) : sim.urlAnimation} controls className="h-full w-full" />
              ) : (
                <iframe title="Reconstitution 3D interactive" className="h-full w-full" src={`${viaApi(d.sceneUrl)}&apiBase=${encodeURIComponent(API)}&lecture=auto`} />
              )}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              {sim?.statut === 'en_attente' || sim?.statut === 'en_cours'
                ? 'Génération de la vidéo en cours…'
                : sim?.statut === 'echec'
                  ? `La dernière génération a échoué : ${sim.erreur ?? 'erreur inconnue'}`
                  : d.analyseIA?.statut === 'terminee' && (d.analyseIA.resultat?.angleImpactDeg ?? -1) >= 0
                    ? `Trajectoires orientées selon l’angle d’impact estimé par l’IA sur les photos (${d.analyseIA.resultat!.angleImpactDeg}°) et les déclarations des conducteurs : illustration, pas une expertise.`
                    : 'Reconstitution générée à partir des déclarations des conducteurs : elle illustre le scénario déclaré, ce n’est pas une expertise.'}
            </p>
          </Carte>

          <div className="grid gap-4 md:grid-cols-2">
            {d.vehiculesImpliques.map((v, i) => (
              <Carte key={v.id}>
                <div className="mb-3 flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white ${i === 0 ? 'bg-vehA' : 'bg-vehB'}`}>{String.fromCharCode(65 + i)}</span>
                  <div>
                    <p className="font-semibold">{v.conducteurNom}</p>
                    <p className="text-xs text-zinc-500">Véhicule {String.fromCharCode(65 + i)}</p>
                  </div>
                </div>
                <dl className="divide-y divide-zinc-100">
                  <Ligne k="Immatriculation" v={v.plaque} />
                  <Ligne k="Marque / modèle" v={v.marque ?? '—'} />
                  <Ligne k="Vitesse estimée" v={v.vitesseEstimee ? `${v.vitesseEstimee.replace(/\D+$/, '')} km/h` : '—'} />
                  <Ligne k="Trajectoire" v={libelle(v.sensCirculation)} />
                  <Ligne k="Zone de choc" v={libelle(v.zoneChoc)} />
                </dl>
              </Carte>
            ))}
          </div>

          <Carte titre={`Photos de la scène (${photos.length})${videos.length ? ` · vidéos (${videos.length})` : ''}`}>
            {scene.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucun média joint au dossier.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {scene.map((m) => <Vignette key={m.id} m={m} onOuvrir={setPhoto} />)}
              </div>
            )}
            {!d.medias.some((m) => m.categorie === 'video_tour') && d.medias.some((m) => m.categorie !== 'libre') && (
              <p className="mt-3 text-xs text-amber-700">La vidéo du tour des véhicules (30 à 45 s) n’a pas été fournie.</p>
            )}
          </Carte>

          <Carte titre="Pièces justificatives">
            <div className="grid gap-4 md:grid-cols-2">
              {(['A', 'B'] as const).map((c) => (
                <div key={c}>
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs text-white ${c === 'A' ? 'bg-vehA' : 'bg-vehB'}`}>{c}</span>
                    {nomConducteur(c) ?? `Conducteur ${c}`}
                  </p>
                  <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                    {DOCUMENTS.map((cat) => {
                      const media = d.medias.find((m) => m.categorie === cat && m.conducteur === c);
                      const absent = d.documentsAbsents.some((x) => x.categorie === cat && x.conducteur === c);
                      return (
                        <li key={cat} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span>{CATEGORIES[cat]}</span>
                          {media ? (
                            <button className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => setPhoto(viaApi(media.url))}>✔ Voir</button>
                          ) : absent ? (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Non détenu</span>
                          ) : (
                            <span className="text-xs text-zinc-400">Non renseigné</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </Carte>

          <Carte titre="Signatures des conducteurs">
            {d.signatures.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucune signature.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {d.signatures.map((s) => (
                  <div key={s.id} className="rounded-xl border border-zinc-200 p-3">
                    <img src={viaApi(s.imageUrl)} alt={`Signature de ${s.conducteurNom}`} className="h-28 w-full rounded-lg bg-white object-contain" />
                    <p className="mt-2 text-sm font-semibold">{s.conducteurNom}</p>
                    <p className="text-xs text-zinc-500">Signé le {dateHeure(s.dateSignature)}</p>
                    <p className="mt-1 break-all font-mono text-[10px] text-zinc-400">SHA-256 {s.hashSignature}</p>
                  </div>
                ))}
              </div>
            )}
          </Carte>

          <Carte titre={`Témoignages (${d.temoignages.length})`}>
            {d.temoignages.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucun témoignage recueilli.{autorite ? ' Utilisez « Témoignage » pour enregistrer la déclaration d’un témoin.' : ''}</p>
            ) : (
              <div className="space-y-3">
                {d.temoignages.map((t) => (
                  <div key={t.id} className="rounded-xl border border-zinc-200 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">{t.temoinNom}{t.temoinTelephone && <span className="font-normal text-zinc-500"> · {t.temoinTelephone}</span>}</p>
                      <p className="text-xs text-zinc-500">{dateHeure(t.date)}{t.recueilliPar ? ` · recueilli par ${t.recueilliPar}` : ''}</p>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-zinc-700">{t.recit}</p>
                  </div>
                ))}
              </div>
            )}
          </Carte>
        </div>

        <div className="space-y-6">
          <Carte titre="Circonstances">
            <dl className="divide-y divide-zinc-100">
              <Ligne k="Date et heure" v={dateHeure(d.dateAccident)} />
              <Ligne
                k="Lieu (GPS)"
                v={
                  d.lat != null && d.lng != null ? (
                    <a className="text-brand-700 hover:underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=17/${d.lat}/${d.lng}`}>
                      {d.lat.toFixed(5)}, {d.lng.toFixed(5)} ↗
                    </a>
                  ) : '—'
                }
              />
              <Ligne k="Conditions météo" v={libelle(d.conditionsMeteo)} />
              <Ligne k="Point de choc" v={libelle(d.pointDeChoc)} />
              <Ligne k="Véhicules" v={d.vehiculesImpliques.length} />
            </dl>
          </Carte>

          <CarteAnalyseIA a={d.analyseIA} autorite={autorite} enCours={analyseEnCours} onLancer={analyserIA} />

          <Carte titre="Intégrité du dossier">
            <p className="text-sm text-zinc-600">Empreinte SHA-256 calculée à la transmission sur les véhicules, le contenu des photos et vidéos, et les signatures.</p>
            <p className="mt-2 break-all rounded-lg bg-zinc-50 p-3 font-mono text-xs text-zinc-700">{d.hashIntegrite ?? 'Non calculée'}</p>
            {d.horodatage ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                <span>Horodatage certifié le <b>{dateHeure(d.horodatage.date)}</b> par {d.horodatage.autorite}</span>
                <button className="text-xs font-semibold text-emerald-800 underline" onClick={() => telechargerFichier(`/dashboard/dossiers/${id}/horodatage.tsr`, `horodatage-${num}.tsr`)}>
                  Télécharger la preuve (.tsr)
                </button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-zinc-500">Ce dossier n’a pas été horodaté par une autorité tierce.</p>
            )}
          </Carte>

          <Carte titre="Assureurs">
            {d.transmissionsAssureurs.length === 0 ? (
              <p className="text-sm text-zinc-500">Pas encore transmis à une compagnie d’assurance.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {d.transmissionsAssureurs.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3">
                    <span className="font-semibold">{t.compagnie}</span>
                    <span className="text-right text-xs text-zinc-500">{dateHeure(t.date)}{t.transmisPar ? `\npar ${t.transmisPar}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          <Carte titre="Historique">
            <ol className="relative space-y-5 border-l border-zinc-200 pl-5">
              {d.evenements.map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${EVT[e.type]?.couleur ?? 'bg-zinc-400'}`} />
                  <p className="text-sm font-semibold">{EVT[e.type]?.libelle ?? e.type}</p>
                  <p className="text-xs text-zinc-500">{dateHeure(e.date)}{e.auteurNom ? ` · ${e.auteurNom}` : ''}</p>
                  {e.commentaire && <p className="mt-1 whitespace-pre-line rounded-lg bg-zinc-50 p-2 text-sm text-zinc-700">{e.commentaire}</p>}
                </li>
              ))}
              {d.evenements.length === 0 && <li className="text-sm text-zinc-500">Aucun événement enregistré.</li>}
            </ol>
          </Carte>
        </div>
      </div>

      <Modale ouvert={action !== null} titre={action ? ACTIONS[action].titre : ''} onFermer={() => !envoi && setAction(null)}>
        {action && (
          <div className="space-y-4">
            {action === 'valider' && (
              <>
                <p className="text-sm text-zinc-600">Qui est responsable de l’accident ?</p>
                <div className="grid grid-cols-2 gap-2">
                  {CONCLUSIONS.map((c) => (
                    <label key={c.valeur} className="cursor-pointer">
                      <input type="radio" name="conclusion" className="peer sr-only" checked={responsabilite === c.valeur} onChange={() => setResponsabilite(c.valeur)} />
                      <span className={`block rounded-xl border-2 border-zinc-200 p-3 transition hover:border-zinc-300 ${c.classes}`}>
                        <span className="block text-sm font-semibold">{c.valeur === 'A' || c.valeur === 'B' ? `${c.titre}${nomConducteur(c.valeur) ? ` (${nomConducteur(c.valeur)})` : ''}` : c.titre}</span>
                        <span className="block text-xs text-zinc-500">{c.detail}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {responsabilite === 'partagee' && (
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <div className="mb-2 flex justify-between text-sm font-semibold">
                      <span className="text-vehA">A : {partA} %</span>
                      <span className="text-vehB">B : {100 - partA} %</span>
                    </div>
                    <input type="range" min={10} max={90} step={5} value={partA} onChange={(e) => setPartA(Number(e.target.value))} className="w-full accent-brand-600" aria-label="Part de responsabilité du conducteur A" />
                    <div className="mt-2 flex gap-2">
                      {[25, 50, 75].map((v) => (
                        <button key={v} type="button" onClick={() => setPartA(v)} className={`rounded-lg px-2 py-1 text-xs font-semibold ${partA === v ? 'bg-brand-600 text-white' : 'bg-white ring-1 ring-zinc-200'}`}>{v}/{100 - v}</button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <textarea className={`${inputCls} min-h-28`} placeholder={ACTIONS[action].placeholder} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} autoFocus />
            {erreurAction && <Erreur message={erreurAction} />}
            <div className="flex justify-end gap-2">
              <Bouton variante="secondaire" onClick={() => setAction(null)} disabled={envoi}>Annuler</Bouton>
              <Bouton variante={ACTIONS[action].variante} onClick={confirmer} disabled={envoi}>{envoi ? '…' : ACTIONS[action].bouton}</Bouton>
            </div>
          </div>
        )}
      </Modale>

      <Modale ouvert={modaleTemoin} titre="Recueillir un témoignage" onFermer={() => !envoi && setModaleTemoin(false)}>
        <form onSubmit={enregistrerTemoin} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Nom du témoin"><input className={inputCls} required value={temoin.temoinNom} onChange={(e) => setTemoin({ ...temoin, temoinNom: e.target.value })} /></Champ>
            <Champ label="Téléphone (facultatif)"><input className={inputCls} value={temoin.temoinTelephone} onChange={(e) => setTemoin({ ...temoin, temoinTelephone: e.target.value })} /></Champ>
          </div>
          <Champ label="Déclaration du témoin">
            <textarea className={`${inputCls} min-h-32`} required value={temoin.recit} onChange={(e) => setTemoin({ ...temoin, recit: e.target.value })} placeholder="Ce que le témoin a vu, dans ses propres mots…" />
          </Champ>
          {erreurAction && <Erreur message={erreurAction} />}
          <div className="flex justify-end gap-2 pt-1">
            <Bouton type="button" variante="secondaire" onClick={() => setModaleTemoin(false)} disabled={envoi}>Annuler</Bouton>
            <Bouton type="submit" disabled={envoi}>{envoi ? '…' : 'Enregistrer le témoignage'}</Bouton>
          </div>
        </form>
      </Modale>

      <Modale ouvert={modaleAssureur} titre="Transmettre à une compagnie d’assurance" onFermer={() => !envoi && setModaleAssureur(false)}>
        <div className="space-y-4">
          {compagnies === null ? (
            <Chargement texte="Chargement des compagnies…" />
          ) : compagnies.length === 0 ? (
            <p className="text-sm text-zinc-600">Aucune compagnie n’a encore de compte. Un administrateur doit d’abord créer un compte « assureur » dans « Comptes ».</p>
          ) : (
            <>
              <p className="text-sm text-zinc-600">Les comptes de la compagnie pourront consulter ce dossier et l’exporter, sans pouvoir le modifier.</p>
              <Champ label="Compagnie">
                <select className={inputCls} value={compagnie} onChange={(e) => setCompagnie(e.target.value)}>
                  {compagnies.map((c) => (
                    <option key={c} value={c} disabled={d.transmissionsAssureurs.some((t) => t.compagnie === c)}>
                      {c}{d.transmissionsAssureurs.some((t) => t.compagnie === c) ? ' (déjà transmis)' : ''}
                    </option>
                  ))}
                </select>
              </Champ>
            </>
          )}
          {erreurAction && <Erreur message={erreurAction} />}
          <div className="flex justify-end gap-2">
            <Bouton variante="secondaire" onClick={() => setModaleAssureur(false)} disabled={envoi}>Annuler</Bouton>
            {compagnies && compagnies.length > 0 && <Bouton onClick={transmettreAssureur} disabled={envoi}>{envoi ? '…' : 'Transmettre'}</Bouton>}
          </div>
        </div>
      </Modale>

      <Modale ouvert={photo !== null} titre="Photo" onFermer={() => setPhoto(null)}>
        {photo && <img src={photo} alt="Photo de l’accident" className="max-h-[70vh] w-full rounded-xl object-contain" />}
      </Modale>
    </div>
  );
}

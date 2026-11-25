'use client';

import { ArrowLeft, Box, Building2, Calendar, Camera, CarFront, Check, Download, Gavel, History, IdCard, MapPin, MessageSquareQuote, NotebookPen, PenLine, Send, ShieldCheck, Sparkles, TriangleAlert, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bouton, Carte, Champ, Chargement, Erreur, GrilleStats, inputCls, LettreVehicule, Modale, Onglets, Pastille, StatutBadge } from '@/components/ui';
import { api, API, telecharger, viaApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORIES, dateHeure, DOCUMENTS, libelle } from '@/lib/format';
import type { AnalyseIA, DossierDetail, Evenement, Media, Responsabilite } from '@/lib/types';

type Action = 'contester' | 'completer';

const ACTIONS: Record<Action, { titre: string; bouton: string; variante: 'danger' | 'primaire'; placeholder: string }> = {
  contester: { titre: 'Contester le constat', bouton: 'Contester', variante: 'danger', placeholder: 'Motif de la contestation (obligatoire)' },
  completer: { titre: 'Ajouter une remarque au dossier', bouton: 'Enregistrer', variante: 'primaire', placeholder: 'Remarque, information complémentaire, constat de l’agent sur place…' },
};

const EVT: Record<Evenement['type'], { libelle: string; couleur: string }> = {
  creation: { libelle: 'Dossier créé par le conducteur', couleur: 'bg-zinc-400' },
  transmission: { libelle: 'Transmis aux autorités', couleur: 'bg-primary' },
  prise_en_charge: { libelle: 'Pris en charge', couleur: 'bg-violet-500' },
  validation: { libelle: 'Constat validé', couleur: 'bg-emerald-500' },
  contestation: { libelle: 'Constat contesté', couleur: 'bg-rose-500' },
  complement: { libelle: 'Remarque ajoutée', couleur: 'bg-amber-500' },
  temoignage: { libelle: 'Témoignage recueilli', couleur: 'bg-sky-500' },
  envoi_assureur: { libelle: 'Transmis à l’assureur', couleur: 'bg-indigo-500' },
};

const CONCLUSIONS: { valeur: Responsabilite; titre: string; detail: string; classes: string }[] = [
  // Donner raison à l’un revient à déclarer l’autre responsable.
  { valeur: 'B', titre: 'A a raison', detail: 'Conducteur B responsable à 100 %', classes: 'peer-checked:border-vehA peer-checked:bg-vehA/10' },
  { valeur: 'A', titre: 'B a raison', detail: 'Conducteur A responsable à 100 %', classes: 'peer-checked:border-vehB peer-checked:bg-vehB/10' },
  { valeur: 'partagee', titre: 'Torts partagés', detail: 'Répartition à préciser', classes: 'peer-checked:border-primary peer-checked:bg-primary-soft' },
  { valeur: 'indeterminee', titre: 'Impossible à dire', detail: 'Éléments insuffisants', classes: 'peer-checked:border-muted-foreground peer-checked:bg-muted' },
];

function Vignette({ m, onOuvrir }: { m: Media; onOuvrir: (url: string) => void }) {
  const titre = `${CATEGORIES[m.categorie] ?? 'Photo'}${m.conducteur ? ` ${m.conducteur}` : ''}`;
  if (m.type === 'video') {
    return (
      <div className="relative">
        <video src={viaApi(m.url)} controls className="aspect-square w-full rounded-md bg-black object-cover" />
        <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
          {titre}{m.dureeSecondes ? ` · ${Math.round(m.dureeSecondes)} s` : ''}
        </span>
      </div>
    );
  }
  return (
    <button onClick={() => onOuvrir(viaApi(m.url))} className="group relative aspect-square overflow-hidden rounded-md bg-muted" title={titre}>
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
      Icone={Sparkles}
      action={autorite ? <Bouton variante="secondaire" taille="sm" onClick={onLancer} disabled={enCours}>{enCours ? 'Analyse…' : a ? 'Relancer' : 'Analyser'}</Bouton> : undefined}
    >
      {!a && <p className="text-sm text-muted-foreground">Aucune analyse. L’IA lit les plaques, les dégâts, la zone de choc, la route et la météo sur les photos.</p>}
      {a && a.statut !== 'terminee' && (
        <p className={`rounded-md p-3 text-sm ${a.statut === 'indisponible' ? 'bg-muted/50 text-muted-foreground' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'}`}>
          {a.statut === 'indisponible' ? 'Analyse IA non configurée sur ce serveur (clé d’API absente).' : `Échec de l’analyse : ${a.erreur ?? 'erreur inconnue'}`}
        </p>
      )}
      {r && (
        <div className="space-y-3 text-sm">
          <p className="rounded-lg bg-primary-soft p-3 text-foreground">{r.resume}</p>
          <dl className="divide-y">
            <Ligne k="Collision" v={`${libelle(r.typeCollision)}${r.angleImpactDeg >= 0 ? ` · ${r.angleImpactDeg}°` : ''}`} />
            <Ligne k="Route" v={libelle(r.typeRoute)} />
            <Ligne k="Météo apparente" v={libelle(r.conditionsMeteo)} />
            {r.vehicules.map((v) => (
              <Ligne key={v.conducteur} k={`Véhicule ${v.conducteur}`} v={<span>{v.plaque || 'plaque illisible'} · {v.marque} {v.couleur}<br /><span className="text-xs font-normal text-muted-foreground">Choc {libelle(v.zoneChoc).toLowerCase()} · {v.degats} ({v.gravite})</span></span>} />
            ))}
          </dl>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Confiance</span><span>{Math.round(r.confiance * 100)} %</span></div>
            <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.round(r.confiance * 100)}%` }} /></div>
          </div>
          <p className="text-xs text-muted-foreground">{a!.photosAnalysees} photo(s){a!.imagesVideo ? ` + ${a!.imagesVideo} images de la vidéo` : ''} · {dateHeure(a!.dateCreation)} · indicatif, sans valeur probante.</p>
        </div>
      )}
    </Carte>
  );
}

function Ligne({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v}</dd>
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
  const [onglet, setOnglet] = useState<'reconstitution' | 'photos' | 'declarations'>('reconstitution');
  const [justification, setJustification] = useState('');
  const [erreurDecision, setErreurDecision] = useState<string | null>(null);
  const [remarqueAssureur, setRemarqueAssureur] = useState('');
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
    if (!commentaire.trim()) return setErreurAction('Ce champ est obligatoire.');
    executer(
      () => api<DossierDetail>(`/dashboard/dossiers/${id}/${action}`, { method: 'POST', json: { commentaire: commentaire.trim() } }),
      () => {
        setAction(null);
        setCommentaire('');
      },
    );
  }

  async function valider() {
    if (!responsabilite) return setErreurDecision('Indiquez qui a raison avant de valider le dossier.');
    if (!justification.trim()) return setErreurDecision('Les remarques justifiant la conclusion sont obligatoires.');
    setErreurDecision(null);
    setEnvoi(true);
    try {
      const json = { commentaire: justification.trim(), responsabilite, ...(responsabilite === 'partagee' ? { partResponsabiliteA: partA } : {}) };
      setD(await api<DossierDetail>(`/dashboard/dossiers/${id}/valider`, { method: 'POST', json }));
      setJustification('');
      setResponsabilite(null);
      setPartA(50);
    } catch (e) {
      setErreurDecision(e instanceof Error ? e.message : 'Validation impossible');
    } finally {
      setEnvoi(false);
    }
  }

  async function prendreEnCharge() {
    setEnvoi(true);
    try {
      setD(await api<DossierDetail>(`/dashboard/dossiers/${id}/prendre-en-charge`, { method: 'POST' }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Prise en charge impossible');
    } finally {
      setEnvoi(false);
    }
  }

  function ouvrirAction(a: Action) {
    setErreurAction(null);
    setCommentaire('');
    setAction(a);
  }

  function enregistrerTemoin(e: React.FormEvent) {
    e.preventDefault();
    const json = { temoinNom: temoin.temoinNom.trim(), recit: temoin.recit.trim(), ...(temoin.temoinTelephone.trim() ? { temoinTelephone: temoin.temoinTelephone.trim() } : {}) };
    executer(
      () => api<DossierDetail>(`/dashboard/dossiers/${id}/temoignages`, { method: 'POST', json }),
      () => {
        setModaleTemoin(false);
        setOnglet('declarations');
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
    executer(() => api<DossierDetail>(`/dashboard/dossiers/${id}/transmettre-assureur`, { method: 'POST', json: { compagnie, ...(remarqueAssureur.trim() ? { remarque: remarqueAssureur.trim() } : {}) } }), () => {
      setModaleAssureur(false);
      setRemarqueAssureur('');
      setCompagnie('');
    });
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
  const piecesFournies = DOCUMENTS.flatMap((cat) => (['A', 'B'] as const).filter((c) => d.medias.some((m) => m.categorie === cat && m.conducteur === c))).length;
  // Un dossier validé avant l’ajout des conclusions doit encore pouvoir recevoir la sienne.
  const priseEnCharge = d.evenements.find((e) => e.type === 'prise_en_charge');
  const aDecider = autorite && (d.statut !== 'valide' || !d.conclusion);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Link href="/dossiers" className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground"><ArrowLeft className="size-4" aria-hidden /> Retour à la liste</Link>
        <nav aria-label="Fil d’Ariane" className="hidden text-sm text-muted-foreground lg:block">Dossiers <span className="mx-1">/</span> <span className="text-foreground">{d.numero}</span></nav>
      </div>

      <section className="space-y-5 rounded-lg border bg-card p-5 shadow-xs md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="hidden size-16 shrink-0 items-center justify-center rounded-full sm:flex bg-primary-soft text-primary-texte ring-4 ring-primary-soft/60"><CarFront className="size-8" aria-hidden /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Dossier <span className="font-stats">{d.numero}</span></h1>
                <StatutBadge statut={d.statut} />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Calendar className="size-3.5" aria-hidden /> Accident du {dateHeure(d.dateAccident)}</span>
                <span className="inline-flex items-center gap-1.5"><Send className="size-3.5" aria-hidden /> Transmis le {dateHeure(d.dateTransmission)}</span>
              </div>
              {d.statut === 'transmis' && priseEnCharge && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-texte"><UserCheck className="size-4 shrink-0" aria-hidden /> En traitement par {priseEnCharge.auteurNom ?? 'un agent'} depuis le {dateHeure(priseEnCharge.date)}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {autorite && d.statut === 'transmis' && !priseEnCharge && <Bouton onClick={prendreEnCharge} disabled={envoi}><UserCheck /> Prendre en charge</Bouton>}
            <Bouton variante="secondaire" onClick={() => telechargerFichier(`/dashboard/dossiers/${id}/export.pdf`, `constat-${num}.pdf`)} disabled={telechargement !== null}>
              <Download /> {telechargement?.endsWith('.pdf') ? 'Export…' : 'Exporter en PDF'}
            </Bouton>
            {autorite && (
              <>
                <Bouton variante="secondaire" onClick={ouvrirAssureur}><Building2 /> Transmettre à l’assureur</Bouton>
                <Bouton variante="secondaire" onClick={() => { setErreurAction(null); setModaleTemoin(true); }}><MessageSquareQuote /> Témoignage</Bouton>
                <Bouton variante="secondaire" onClick={() => ouvrirAction('completer')}><NotebookPen /> Ajouter une remarque</Bouton>
                {d.statut !== 'conteste' && <Bouton variante="danger" onClick={() => ouvrirAction('contester')}><TriangleAlert /> Contester</Bouton>}
              </>
            )}
          </div>
        </div>
        <GrilleStats
          stats={[
            { titre: 'Photos et vidéos', valeur: d.medias.length, sous: `${photos.length} photo${photos.length > 1 ? 's' : ''} · ${videos.length} vidéo${videos.length > 1 ? 's' : ''}`, Icone: Camera, teinte: 'violet', onClick: () => setOnglet('photos') },
            { titre: 'Pièces fournies', valeur: `${piecesFournies}/${DOCUMENTS.length * 2}`, sous: d.documentsAbsents.length ? `${d.documentsAbsents.length} non détenue${d.documentsAbsents.length > 1 ? 's' : ''}` : 'Deux conducteurs', Icone: IdCard, teinte: 'bleu', onClick: () => setOnglet('photos') },
            { titre: 'Témoignages', valeur: d.temoignages.length, sous: 'Recueillis par un agent', Icone: MessageSquareQuote, teinte: 'ambre', onClick: () => setOnglet('declarations') },
            { titre: 'Signatures', valeur: d.signatures.length, sous: 'Conducteurs signataires', Icone: PenLine, teinte: 'vert', onClick: () => setOnglet('declarations') },
          ]}
        />
      </section>

      {erreur && <Erreur message={erreur} />}

      {d.agentTraitant && (
        <section className={`flex gap-4 rounded-lg border p-5 text-sm ${d.statut === 'valide' ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100' : 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100'}`}>
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-md text-white ${d.statut === 'valide' ? 'bg-emerald-700' : 'bg-rose-700'}`}>{d.statut === 'valide' ? <Gavel className="size-5" aria-hidden /> : <TriangleAlert className="size-5" aria-hidden />}</span>
          <div className="min-w-0 flex-1">
            {d.statut === 'valide' && d.conclusion && (
              <div className="mb-1.5 flex flex-wrap items-center gap-3">
                <span className="text-base font-bold">Conclusion : {d.conclusion.libelle}</span>
                {d.conclusion.partResponsabiliteA !== null && (
                  <span className="flex h-2.5 w-48 gap-0.5 overflow-hidden rounded-full" title={`A ${d.conclusion.partResponsabiliteA} % · B ${100 - d.conclusion.partResponsabiliteA} %`}>
                    <span className="bg-vehA" style={{ width: `${d.conclusion.partResponsabiliteA}%` }} />
                    <span className="flex-1 bg-vehB" />
                  </span>
                )}
              </div>
            )}
            <b>{d.statut === 'valide' ? 'Validé' : 'Contesté'}</b> par {d.agentTraitant.nom}
            {d.agentTraitant.matricule ? ` (matricule ${d.agentTraitant.matricule})` : ''} le {dateHeure(d.dateTraitement)}
            {d.commentaireAgent && <p className="mt-1.5 whitespace-pre-line">« {d.commentaireAgent} »</p>}
          </div>
        </section>
      )}

      {aDecider && (
        <Carte titre={d.statut === 'valide' ? 'Conclusion manquante : qui a raison ?' : 'Décision de l’autorité : qui a raison ?'} description="Choisissez une conclusion et justifiez-la" Icone={Gavel} className="border-primary/40 ring-3 ring-[var(--ring)]">
          <div className="space-y-4">
            <div role="radiogroup" aria-label="Qui a raison ?" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {CONCLUSIONS.map((c) => {
                const nom = c.valeur === 'B' ? nomConducteur('A') : c.valeur === 'A' ? nomConducteur('B') : undefined;
                return (
                  <label key={c.valeur} className="cursor-pointer">
                    <input type="radio" name="conclusion" className="peer sr-only" checked={responsabilite === c.valeur} onChange={() => { setResponsabilite(c.valeur); setErreurDecision(null); }} />
                    <span className={`block h-full rounded-md border-2 p-3 transition hover:border-muted-foreground/40 peer-focus-visible:ring-4 peer-focus-visible:ring-[var(--ring)] ${c.classes}`}>
                      <span className="flex items-start justify-between gap-2 text-sm font-bold">{c.titre}{nom ? ` (${nom})` : ''}{responsabilite === c.valeur && <Check className="size-4 shrink-0" aria-hidden />}</span>
                      <span className="block text-xs text-muted-foreground">{c.detail}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {responsabilite === 'partagee' && (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="mb-2 text-xs text-muted-foreground">Part de responsabilité de chaque conducteur</p>
                <div className="mb-2 flex justify-between text-sm font-semibold">
                  <span className="text-vehA">A : {partA} %</span>
                  <span className="text-vehB">B : {100 - partA} %</span>
                </div>
                <input type="range" min={10} max={90} step={5} value={partA} onChange={(e) => setPartA(Number(e.target.value))} className="w-full accent-primary" aria-label="Part de responsabilité du conducteur A" />
                <div className="mt-2 flex gap-2">
                  {[25, 50, 75].map((v) => (
                    <button key={v} type="button" onClick={() => setPartA(v)} className={`rounded-lg px-2 py-1 text-xs font-semibold ${partA === v ? 'bg-primary text-white' : 'border bg-card'}`}>{v}/{100 - v}</button>
                  ))}
                </div>
              </div>
            )}
            <Champ label="Remarques et justification (obligatoire)">
              <textarea id="justification" className={`${inputCls} min-h-24`} maxLength={2000} placeholder="Éléments du dossier, photos, témoignages, constat sur place…" value={justification} onChange={(e) => setJustification(e.target.value)} />
            </Champ>
            {erreurDecision && <Erreur message={erreurDecision} />}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">La conclusion et vos remarques sont visibles des conducteurs et des assureurs, et figurent dans le PDF.</p>
              <Bouton variante="succes" taille="lg" onClick={valider} disabled={envoi}><Gavel /> {envoi ? '…' : d.statut === 'valide' ? 'Enregistrer la conclusion' : 'Valider le dossier'}</Bouton>
            </div>
          </div>
        </Carte>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-4">
          <Onglets
            label="Contenu du dossier"
            valeur={onglet}
            onChange={setOnglet}
            options={[
              { valeur: 'reconstitution', libelle: 'Reconstitution', Icone: Box },
              { valeur: 'photos', libelle: 'Photos et pièces', Icone: Camera, n: d.medias.length },
              { valeur: 'declarations', libelle: 'Signatures et témoignages', Icone: PenLine, n: d.signatures.length + d.temoignages.length },
            ]}
          />

          {/* Masqué et non démonté : la scène 3D ne se recharge pas à chaque changement d’onglet. */}
          <div className={`space-y-4 ${onglet === 'reconstitution' ? '' : 'hidden'}`}>
          <Carte
            titre="Reconstitution 3D"
            Icone={Box}
            action={
              <div className="flex items-center gap-2">
                {videoPrete && (
                  <div className="flex rounded-lg bg-muted p-0.5 text-xs font-semibold">
                    {(['video', 'interactive'] as const).map((m) => (
                      <button key={m} onClick={() => setVue3d(m)} className={`rounded-md px-3 py-1.5 ${vue3d === m ? 'bg-card shadow-xs' : 'text-muted-foreground'}`}>
                        {m === 'video' ? 'Vidéo' : 'Interactive'}
                      </button>
                    ))}
                  </div>
                )}
                {autorite && (
                  <Bouton variante="secondaire" taille="sm" onClick={generer3d} disabled={sim?.statut === 'en_attente' || sim?.statut === 'en_cours'}>
                    {sim ? 'Régénérer la vidéo' : 'Générer la vidéo'}
                  </Bouton>
                )}
              </div>
            }
          >
            <div className="aspect-video overflow-hidden rounded-md bg-zinc-900">
              {mode3d === 'video' && sim?.urlAnimation ? (
                <video src={sim.urlAnimation.startsWith('/') ? viaApi(sim.urlAnimation) : sim.urlAnimation} controls className="h-full w-full" />
              ) : (
                <iframe title="Reconstitution 3D interactive" className="h-full w-full" src={`${viaApi(d.sceneUrl)}&apiBase=${encodeURIComponent(API)}&lecture=auto`} />
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
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
                  <LettreVehicule i={i} taille="lg" />
                  <div>
                    <p className="font-semibold">{v.conducteurNom}</p>
                    <p className="text-xs text-muted-foreground">Véhicule {String.fromCharCode(65 + i)}</p>
                  </div>
                </div>
                <dl className="divide-y">
                  <Ligne k="Immatriculation" v={v.plaque} />
                  <Ligne k="Marque / modèle" v={v.marque ?? '—'} />
                  <Ligne k="Vitesse estimée" v={v.vitesseEstimee ? `${v.vitesseEstimee.replace(/\D+$/, '')} km/h` : '—'} />
                  <Ligne k="Trajectoire" v={libelle(v.sensCirculation)} />
                  <Ligne k="Zone de choc" v={libelle(v.zoneChoc)} />
                </dl>
              </Carte>
            ))}
          </div>

          </div>

          <div className={`space-y-4 ${onglet === 'photos' ? '' : 'hidden'}`}>
          <Carte Icone={Camera} titre={`Photos de la scène (${photos.length})${videos.length ? ` · vidéos (${videos.length})` : ''}`}>
            {scene.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun média joint au dossier.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {scene.map((m) => <Vignette key={m.id} m={m} onOuvrir={setPhoto} />)}
              </div>
            )}
            {!d.medias.some((m) => m.categorie === 'video_tour') && d.medias.some((m) => m.categorie !== 'libre') && (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">La vidéo du tour des véhicules (30 à 45 s) n’a pas été fournie.</p>
            )}
          </Carte>

          <Carte titre="Pièces justificatives" Icone={IdCard}>
            <div className="grid gap-4 md:grid-cols-2">
              {(['A', 'B'] as const).map((c) => (
                <div key={c}>
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <LettreVehicule i={c === 'A' ? 0 : 1} />
                    {nomConducteur(c) ?? `Conducteur ${c}`}
                  </p>
                  <ul className="divide-y rounded-md border">
                    {DOCUMENTS.map((cat) => {
                      const media = d.medias.find((m) => m.categorie === cat && m.conducteur === c);
                      const absent = d.documentsAbsents.some((x) => x.categorie === cat && x.conducteur === c);
                      return (
                        <li key={cat} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span>{CATEGORIES[cat]}</span>
                          {media ? (
                            <button className="inline-flex items-center gap-1 text-xs font-semibold text-primary-texte hover:underline" onClick={() => setPhoto(viaApi(media.url))}><Check className="size-3.5" aria-hidden /> Voir</button>
                          ) : absent ? (
                            <Pastille ton="rouge">Non détenu</Pastille>
                          ) : (
                            <span className="text-xs text-muted-foreground">Non renseigné</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </Carte>

          </div>

          <div className={`space-y-4 ${onglet === 'declarations' ? '' : 'hidden'}`}>
          <Carte titre="Signatures des conducteurs" Icone={PenLine}>
            {d.signatures.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune signature.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {d.signatures.map((s) => (
                  <div key={s.id} className="rounded-md border p-3">
                    <img src={viaApi(s.imageUrl)} alt={`Signature de ${s.conducteurNom}`} className="h-28 w-full rounded-lg bg-white object-contain" />
                    <p className="mt-2 text-sm font-semibold">{s.conducteurNom}</p>
                    <p className="text-xs text-muted-foreground">Signé le {dateHeure(s.dateSignature)}</p>
                    <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">SHA-256 {s.hashSignature}</p>
                  </div>
                ))}
              </div>
            )}
          </Carte>

          <Carte Icone={MessageSquareQuote} titre={`Témoignages (${d.temoignages.length})`}>
            {d.temoignages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun témoignage recueilli.{autorite ? ' Utilisez « Témoignage » pour enregistrer la déclaration d’un témoin.' : ''}</p>
            ) : (
              <div className="space-y-3">
                {d.temoignages.map((t) => (
                  <div key={t.id} className="rounded-md border p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">{t.temoinNom}{t.temoinTelephone && <span className="font-normal text-muted-foreground"> · {t.temoinTelephone}</span>}</p>
                      <p className="text-xs text-muted-foreground">{dateHeure(t.date)}{t.recueilliPar ? ` · recueilli par ${t.recueilliPar}` : ''}</p>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-foreground">{t.recit}</p>
                  </div>
                ))}
              </div>
            )}
          </Carte>
          </div>
        </div>

        <div className="space-y-4">
          <Carte titre="Circonstances" Icone={MapPin}>
            <dl className="divide-y">
              <Ligne k="Date et heure" v={dateHeure(d.dateAccident)} />
              <Ligne
                k="Lieu (GPS)"
                v={
                  d.lat != null && d.lng != null ? (
                    <a className="text-primary-texte hover:underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=17/${d.lat}/${d.lng}`}>
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

          <Carte titre="Intégrité du dossier" Icone={ShieldCheck}>
            <p className="text-sm text-muted-foreground">Empreinte SHA-256 calculée à la transmission sur les véhicules, le contenu des photos et vidéos, et les signatures.</p>
            <p className="mt-2 break-all rounded-lg bg-muted/50 p-3 font-mono text-xs text-foreground">{d.hashIntegrite ?? 'Non calculée'}</p>
            {d.horodatage ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                <span>Horodatage certifié le <b>{dateHeure(d.horodatage.date)}</b> par {d.horodatage.autorite}</span>
                <button className="text-xs font-semibold underline" onClick={() => telechargerFichier(`/dashboard/dossiers/${id}/horodatage.tsr`, `horodatage-${num}.tsr`)}>
                  Télécharger la preuve (.tsr)
                </button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">Ce dossier n’a pas été horodaté par une autorité tierce.</p>
            )}
          </Carte>

          <Carte titre="Assureurs" Icone={Building2}>
            {d.transmissionsAssureurs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pas encore transmis à une compagnie d’assurance.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {d.transmissionsAssureurs.map((t) => (
                  <li key={t.id}>
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold">{t.compagnie}</span>
                      <span className="text-right text-xs text-muted-foreground">{dateHeure(t.date)}{t.transmisPar ? ` par ${t.transmisPar}` : ''}</span>
                    </div>
                    {t.remarque && <p className="mt-1 whitespace-pre-line rounded-lg bg-muted/50 p-2 text-foreground">{t.remarque}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          <Carte titre="Historique" Icone={History}>
            <ol className="relative space-y-5 border-l pl-5">
              {d.evenements.map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-card ${EVT[e.type]?.couleur ?? 'bg-zinc-400'}`} />
                  <p className="text-sm font-semibold">{EVT[e.type]?.libelle ?? e.type}</p>
                  <p className="text-xs text-muted-foreground">{dateHeure(e.date)}{e.auteurNom ? ` · ${e.auteurNom}` : ''}</p>
                  {e.commentaire && <p className="mt-1 whitespace-pre-line rounded-lg bg-muted/50 p-2 text-sm text-foreground">{e.commentaire}</p>}
                </li>
              ))}
              {d.evenements.length === 0 && <li className="text-sm text-muted-foreground">Aucun événement enregistré.</li>}
            </ol>
          </Carte>
        </div>
      </div>

      <Modale ouvert={action !== null} titre={action ? ACTIONS[action].titre : ''} onFermer={() => !envoi && setAction(null)}>
        {action && (
          <div className="space-y-4">
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
            <p className="text-sm text-muted-foreground">Aucune compagnie n’a encore de compte. Un administrateur doit d’abord créer un compte « assureur » dans « Comptes ».</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Les comptes de la compagnie pourront consulter ce dossier et l’exporter, sans pouvoir le modifier.</p>
              <Champ label="Compagnie">
                <select className={inputCls} value={compagnie} onChange={(e) => setCompagnie(e.target.value)}>
                  {compagnies.map((c) => (
                    <option key={c} value={c} disabled={d.transmissionsAssureurs.some((t) => t.compagnie === c)}>
                      {c}{d.transmissionsAssureurs.some((t) => t.compagnie === c) ? ' (déjà transmis)' : ''}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ label="Remarques pour la compagnie (facultatif)">
                <textarea className={`${inputCls} min-h-24`} maxLength={2000} value={remarqueAssureur} onChange={(e) => setRemarqueAssureur(e.target.value)} placeholder="Points à signaler avant l’envoi. Seule cette compagnie les verra." />
              </Champ>
              {!d.conclusion && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Ce dossier n’a pas encore de conclusion : la compagnie le recevra sans savoir qui a raison.</p>}
            </>
          )}
          {erreurAction && <Erreur message={erreurAction} />}
          <div className="flex justify-end gap-2">
            <Bouton variante="secondaire" onClick={() => setModaleAssureur(false)} disabled={envoi}>Annuler</Bouton>
            {compagnies && compagnies.length > 0 && <Bouton onClick={transmettreAssureur} disabled={envoi}>{envoi ? '…' : 'Transmettre'}</Bouton>}
          </div>
        </div>
      </Modale>

      <Modale large ouvert={photo !== null} titre="Photo" onFermer={() => setPhoto(null)}>
        {photo && <img src={photo} alt="Photo de l’accident" className="max-h-[70vh] w-full rounded-md object-contain" />}
      </Modale>
    </div>
  );
}

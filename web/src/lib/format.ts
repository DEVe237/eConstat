import type { Statut } from './types';

const TZ = 'Africa/Douala';

export const dateHeure = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }) : '—';

export const dateCourte = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', timeZone: TZ }) : '—';

export const STATUTS: Record<Statut, { libelle: string; classes: string; point: string }> = {
  transmis: { libelle: 'À traiter', classes: 'bg-amber-50 text-amber-800 ring-amber-200', point: '#f59e0b' },
  valide: { libelle: 'Validé', classes: 'bg-emerald-50 text-emerald-800 ring-emerald-200', point: '#10b981' },
  conteste: { libelle: 'Contesté', classes: 'bg-rose-50 text-rose-800 ring-rose-200', point: '#e11d48' },
  brouillon: { libelle: 'Brouillon', classes: 'bg-zinc-100 text-zinc-700 ring-zinc-200', point: '#71717a' },
};

const LIBELLES: Record<string, string> = {
  avant: 'Avant',
  arriere: 'Arrière',
  flanc_gauche: 'Flanc gauche',
  flanc_droit: 'Flanc droit',
  gauche: 'Tournait à gauche',
  droite: 'Tournait à droite',
  tout_droit: 'Tout droit',
  stationnement: 'En stationnement',
  meteo_beau: 'Beau temps',
  meteo_pluie: 'Pluie',
  meteo_humide: 'Chaussée humide',
  meteo_brouillard: 'Brouillard',
  meteo_nuit: 'Nuit',
};

/** Rend lisibles les valeurs techniques enregistrées par l'app (flanc_gauche → Flanc gauche). */
export const libelle = (v: string | null | undefined) => {
  if (!v) return '—';
  return LIBELLES[v] ?? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
};

export const duree = (heures: number | null) => {
  if (heures == null) return '—';
  if (heures < 1) return `${Math.round(heures * 60)} min`;
  if (heures < 48) return `${heures.toFixed(1).replace('.', ',')} h`;
  return `${Math.round(heures / 24)} j`;
};

/** Étapes de la capture guidée, dans l'ordre de l'application mobile. */
export const CATEGORIES: Record<string, string> = {
  plaque: 'Plaque',
  vue_ensemble: 'Vue d’ensemble',
  vehicule: 'Véhicule',
  carte_grise: 'Carte grise',
  visite_technique: 'Visite technique',
  assurance: 'Assurance',
  cni: 'CNI',
  permis: 'Permis de conduire',
  autre_document: 'Autre document',
  video_tour: 'Vidéo du tour',
  libre: 'Photo libre',
};

export const DOCUMENTS = ['carte_grise', 'visite_technique', 'assurance', 'cni', 'permis', 'autre_document'] as const;

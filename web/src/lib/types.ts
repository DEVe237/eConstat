export type Statut = 'transmis' | 'valide' | 'conteste' | 'brouillon';

export interface VehiculeResume {
  conducteurNom: string;
  plaque: string;
  marque: string | null;
}

export interface DossierResume {
  id: string;
  numero: string;
  statut: Statut;
  dateAccident: string | null;
  dateTransmission: string | null;
  lat: number | null;
  lng: number | null;
  conditionsMeteo: string | null;
  vehicules: VehiculeResume[];
}

export interface ListeDossiers {
  items: DossierResume[];
  total: number;
  page: number;
  limite: number;
}

export interface Vehicule extends VehiculeResume {
  id: string;
  vitesseEstimee: string | null;
  sensCirculation: string | null;
  zoneChoc: string | null;
}

export interface Media {
  id: string;
  type: 'photo' | 'video';
  url: string;
  empreinte: string | null;
  horodatage: string;
  categorie: CategorieMedia;
  conducteur: 'A' | 'B' | null;
  dureeSecondes: number | null;
}

export type CategorieMedia =
  | 'plaque' | 'vue_ensemble' | 'vehicule' | 'carte_grise' | 'visite_technique' | 'assurance'
  | 'cni' | 'permis' | 'autre_document' | 'video_tour' | 'libre';

export type Responsabilite = 'A' | 'B' | 'partagee' | 'indeterminee';

export interface AnalyseIA {
  id: string;
  statut: 'terminee' | 'echouee' | 'indisponible';
  modele: string | null;
  photosAnalysees: number;
  imagesVideo: number;
  erreur: string | null;
  dateCreation: string;
  resultat: {
    vehicules: { conducteur: 'A' | 'B'; plaque: string; marque: string; couleur: string; zoneChoc: string; degats: string; gravite: string }[];
    typeRoute: string;
    conditionsMeteo: string;
    typeCollision: string;
    angleImpactDeg: number;
    resume: string;
    confiance: number;
  } | null;
}

export interface Signature {
  id: string;
  conducteurNom: string;
  imageUrl: string;
  hashSignature: string;
  dateSignature: string;
}

export interface Simulation {
  id: string;
  statut: 'en_attente' | 'en_cours' | 'termine' | 'echec';
  urlAnimation?: string | null;
  erreur?: string | null;
  dateDemande: string;
}

export interface Temoignage {
  id: string;
  temoinNom: string;
  temoinTelephone: string | null;
  recit: string;
  recueilliPar: string | null;
  date: string;
}

export interface TransmissionAssureur {
  id: string;
  compagnie: string;
  transmisPar: string | null;
  remarque: string | null;
  date: string;
}

export interface Evenement {
  id: string;
  type: 'creation' | 'transmission' | 'prise_en_charge' | 'validation' | 'contestation' | 'complement' | 'temoignage' | 'envoi_assureur';
  auteurNom: string | null;
  commentaire: string | null;
  date: string;
}

export interface DossierDetail {
  id: string;
  numero: string;
  statut: Statut;
  dateAccident: string | null;
  dateCreation: string;
  dateTransmission: string | null;
  dateTraitement: string | null;
  lat: number | null;
  lng: number | null;
  pointDeChoc: string | null;
  conditionsMeteo: string | null;
  hashIntegrite: string | null;
  commentaireAgent: string | null;
  conclusion: { responsabilite: Responsabilite; partResponsabiliteA: number | null; libelle: string } | null;
  documentsAbsents: { conducteur: 'A' | 'B'; categorie: CategorieMedia }[];
  analyseIA: AnalyseIA | null;
  agentTraitant: { id: string; nom: string; matricule: string | null; unite: string | null } | null;
  vehiculesImpliques: Vehicule[];
  medias: Media[];
  signatures: Signature[];
  simulations3d: Simulation[];
  evenements: Evenement[];
  temoignages: Temoignage[];
  transmissionsAssureurs: TransmissionAssureur[];
  horodatage: { date: string; autorite: string } | null;
  /** Lien signé vers la visionneuse 3D interactive. */
  sceneUrl: string;
}

export interface Statistiques {
  totaux: { transmis: number; valide: number; conteste: number; total: number };
  parJour: { jour: string; n: number }[];
  delaiTraitementHeures: number | null;
  delaiTransmissionMinutes: number | null;
  zonesARisque: { lat: number; lng: number; n: number }[];
  meteo: { valeur: string; n: number }[];
  zonesChoc: { valeur: string; n: number }[];
  parHeure: { heure: number; n: number }[];
  points: { id: string; numero: string; lat: number; lng: number; statut: Statut }[];
}

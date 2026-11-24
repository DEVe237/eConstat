import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type StatutAnalyseIA = 'terminee' | 'echouee' | 'indisponible';

/** Constat visuel d'un véhicule, déduit des photos. */
export interface VehiculeAnalyse {
  conducteur: 'A' | 'B';
  plaque: string;
  marque: string;
  couleur: string;
  zoneChoc: 'avant' | 'arriere' | 'flanc_gauche' | 'flanc_droit' | 'inconnue';
  degats: string;
  gravite: 'legere' | 'moyenne' | 'importante' | 'inconnue';
}

/** Résultat structuré de l'analyse des photos par le modèle de vision. */
export interface ResultatAnalyseIA {
  vehicules: VehiculeAnalyse[];
  typeRoute: 'route_urbaine' | 'carrefour' | 'rond_point' | 'route_nationale' | 'piste' | 'parking' | 'inconnu';
  conditionsMeteo: 'meteo_beau' | 'meteo_pluie' | 'meteo_humide' | 'meteo_brouillard' | 'meteo_nuit' | 'inconnu';
  typeCollision: 'frontale' | 'arriere' | 'laterale' | 'en_angle' | 'autre' | 'inconnu';
  /**
   * Angle entre les directions de déplacement des deux véhicules au moment du
   * choc, en degrés : 0 = même sens (choc arrière), 90 = perpendiculaire,
   * 180 = face à face. -1 si l'angle ne peut pas être estimé.
   */
  angleImpactDeg: number;
  resume: string;
  /** Confiance globale du modèle, de 0 à 1. */
  confiance: number;
}

/**
 * Analyse IA des photos d'un dossier (cahier de conception — entité AnalyseIA).
 * C'est une suggestion pour pré-remplir le formulaire et affiner la
 * reconstitution 3D : elle n'a aucune valeur probante et ne remplace ni la
 * déclaration des conducteurs ni la conclusion de l'agent.
 */
@Entity('analyses_ia')
export class AnalyseIA {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  dossierId: string;

  @Column({ type: 'varchar', length: 15 })
  statut: StatutAnalyseIA;

  @Column({ type: 'varchar', length: 60, nullable: true })
  modele: string | null;

  @Column({ type: 'jsonb', nullable: true })
  resultat: ResultatAnalyseIA | null;

  @Column({ type: 'smallint', default: 0 })
  photosAnalysees: number;

  @Column({ type: 'text', nullable: true })
  erreur: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreation: Date;
}

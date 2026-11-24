import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DossierConstat } from './dossier-constat.entity';

export type TypeMedia = 'photo' | 'video';

/** Étapes de la capture guidée (cahier de conception — capture guidée). */
export const CATEGORIES_MEDIA = [
  'plaque',
  'vue_ensemble',
  'vehicule',
  'carte_grise',
  'visite_technique',
  'assurance',
  'cni',
  'permis',
  'autre_document',
  'video_tour',
  'libre',
] as const;
export type CategorieMedia = (typeof CATEGORIES_MEDIA)[number];
/** Catégories de pièces justificatives, propres à chaque conducteur. */
export const CATEGORIES_DOCUMENT: CategorieMedia[] = ['carte_grise', 'visite_technique', 'assurance', 'cni', 'permis', 'autre_document'];
/** Durée imposée de la vidéo du tour des véhicules, en secondes. */
export const DUREE_VIDEO_TOUR = { min: 30, max: 45 };

@Entity('medias')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DossierConstat, (d) => d.medias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossier_id' })
  dossier: DossierConstat;

  @Column({ name: 'dossier_id' })
  dossierId: string;

  @Column({ type: 'varchar', length: 10 })
  type: TypeMedia;

  @Column({ type: 'text' })
  url: string;

  /** SHA-256 du contenu du fichier, calculé à la réception : intégré à l'empreinte du dossier. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  empreinte: string | null;

  @Column({ type: 'varchar', length: 20, default: 'libre' })
  categorie: CategorieMedia;

  /** Conducteur concerné (A ou B) pour les plaques, vues véhicule et documents. */
  @Column({ type: 'varchar', length: 1, nullable: true })
  conducteur: 'A' | 'B' | null;

  /** Durée de la vidéo en secondes. */
  @Column({ type: 'real', nullable: true })
  dureeSecondes: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  horodatage: Date;
}

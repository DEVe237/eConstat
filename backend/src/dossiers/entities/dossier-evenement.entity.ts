import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DossierConstat } from './dossier-constat.entity';

export type TypeEvenement =
  | 'creation'
  | 'transmission'
  | 'validation'
  | 'contestation'
  | 'complement'
  | 'temoignage'
  | 'envoi_assureur';

/**
 * Historique d'un dossier (cahier des charges §5.4 — « consultation détaillée
 * d'un dossier : … historique »). Une ligne par action, jamais modifiée.
 */
@Entity('dossiers_evenements')
export class DossierEvenement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DossierConstat, (d) => d.evenements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossier_id' })
  dossier: DossierConstat;

  @Column({ name: 'dossier_id' })
  dossierId: string;

  @Column({ type: 'varchar', length: 20 })
  type: TypeEvenement;

  @Column({ type: 'uuid', nullable: true })
  auteurId: string | null;

  @Column({ type: 'varchar', length: 170, nullable: true })
  auteurNom: string | null;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  date: Date;
}

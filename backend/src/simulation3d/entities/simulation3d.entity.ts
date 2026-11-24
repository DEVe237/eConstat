import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DossierConstat } from '../../dossiers/entities/dossier-constat.entity';

export type StatutSimulation3D =
  | 'en_attente'
  | 'en_cours'
  | 'termine'
  | 'echec';

/**
 * Suivi de la génération de la reconstitution 3D d'un dossier (cahier de
 * conception §6/§7.1). Une ligne par tentative de génération : `soumettre`
 * une nouvelle demande crée une nouvelle ligne plutôt que d'écraser l'ancienne,
 * pour garder l'historique des générations (utile en cas d'échec).
 */
@Entity('simulations_3d')
export class Simulation3D {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DossierConstat, (d) => d.simulations3d, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dossier_id' })
  dossier: DossierConstat;

  @Column({ name: 'dossier_id' })
  dossierId: string;

  @Column({ type: 'varchar', length: 20, default: 'en_attente' })
  statut: StatutSimulation3D;

  @CreateDateColumn({ type: 'timestamptz' })
  dateDemande: Date;

  @Column({ type: 'text', nullable: true })
  urlAnimation: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateGeneration: Date | null;

  @Column({ type: 'text', nullable: true })
  erreur: string | null;
}

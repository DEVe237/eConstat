import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { DossierConstat } from './dossier-constat.entity';

/**
 * Transmission d'un dossier à une compagnie d'assurance (cahier des charges
 * §4 — acteur « Assureur », EF-10). Les comptes assureur de cette compagnie
 * peuvent alors consulter le dossier.
 */
@Entity('transmissions_assureurs')
@Unique(['dossierId', 'compagnie'])
export class TransmissionAssureur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DossierConstat, (d) => d.transmissionsAssureurs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossier_id' })
  dossier: DossierConstat;

  @Column({ name: 'dossier_id' })
  dossierId: string;

  @Column({ type: 'varchar', length: 120 })
  compagnie: string;

  @Column({ type: 'varchar', length: 170, nullable: true })
  transmisPar: string | null;

  /** Remarque de l'agent à l'attention de cette compagnie (les autres ne la voient pas). */
  @Column({ type: 'text', nullable: true })
  remarque: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  date: Date;
}

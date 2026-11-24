import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DossierConstat } from './dossier-constat.entity';

/**
 * Témoignage d'un tiers présent sur les lieux (cahier des charges §4 —
 * acteur « Témoin », exigence EF-09), recueilli par un agent.
 */
@Entity('temoignages')
export class Temoignage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DossierConstat, (d) => d.temoignages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossier_id' })
  dossier: DossierConstat;

  @Column({ name: 'dossier_id' })
  dossierId: string;

  @Column({ type: 'varchar', length: 160 })
  temoinNom: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  temoinTelephone: string | null;

  @Column({ type: 'text' })
  recit: string;

  /** Agent ayant recueilli le témoignage. */
  @Column({ type: 'varchar', length: 170, nullable: true })
  recueilliPar: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  date: Date;
}

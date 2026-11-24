import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DossierConstat } from './dossier-constat.entity';

@Entity('vehicules_impliques')
export class VehiculeImplique {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DossierConstat, (d) => d.vehiculesImpliques, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dossier_id' })
  dossier: DossierConstat;

  @Column({ name: 'dossier_id' })
  dossierId: string;

  /** Ordre d'ajout : le premier véhicule est le conducteur A, le second le conducteur B. */
  @CreateDateColumn({ type: 'timestamptz' })
  dateAjout: Date;

  @Column({ type: 'varchar', length: 120 })
  conducteurNom: string;

  @Column({ type: 'varchar', length: 20 })
  plaque: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  marque: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  vitesseEstimee: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  sensCirculation: string | null;

  /** Zone d'impact déclarée sur ce véhicule (avant/arrière/flanc_gauche/flanc_droit). */
  @Column({ type: 'varchar', length: 20, nullable: true })
  zoneChoc: string | null;
}

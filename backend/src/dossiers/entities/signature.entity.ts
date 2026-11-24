import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DossierConstat } from './dossier-constat.entity';

@Entity('signatures')
export class Signature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DossierConstat, (d) => d.signatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dossier_id' })
  dossier: DossierConstat;

  @Column({ name: 'dossier_id' })
  dossierId: string;

  @Column({ type: 'varchar', length: 120 })
  conducteurNom: string;

  @Column({ type: 'text' })
  imageUrl: string;

  /** Empreinte SHA-256 de l'image de signature, cahier de conception §8. */
  @Column({ type: 'varchar', length: 64 })
  hashSignature: string;

  @CreateDateColumn({ type: 'timestamptz' })
  dateSignature: Date;
}

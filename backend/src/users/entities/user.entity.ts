import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type RoleUtilisateur = 'usager' | 'agent' | 'administrateur' | 'assureur';

/** Cahier de conception §7.1 — entité Utilisateur. */
@Entity('utilisateurs')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  nom: string;

  @Column({ type: 'varchar', length: 80 })
  prenom: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telephone: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  permisConduire: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  adresse: string | null;

  /** Assureur et numéro de contrat déclarés par le conducteur. */
  @Column({ type: 'varchar', length: 160, nullable: true })
  assurance: string | null;

  @Column({ type: 'varchar', length: 20, default: 'usager' })
  role: RoleUtilisateur;

  /** Agents des forces de l'ordre (cahier de conception §7.1 — entité Agent). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  matricule: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  unite: string | null;

  /** Compagnie d'assurance (comptes « assureur » uniquement). */
  @Column({ type: 'varchar', length: 120, nullable: true })
  compagnie: string | null;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'varchar', length: 255 })
  motDePasseHash: string;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreation: Date;
}

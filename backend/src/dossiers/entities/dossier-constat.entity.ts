import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VehiculeImplique } from './vehicule-implique.entity';
import { Media } from './media.entity';
import { Signature } from './signature.entity';
import { DossierEvenement } from './dossier-evenement.entity';
import { Temoignage } from './temoignage.entity';
import { TransmissionAssureur } from './transmission-assureur.entity';
import { Simulation3D } from '../../simulation3d/entities/simulation3d.entity';

export type StatutDossier = 'brouillon' | 'transmis' | 'valide' | 'conteste';

/**
 * Entité centrale du modèle de données (cahier de conception §7.1/§7.3).
 * conditions_meteo et point_de_choc complètent les champs du document
 * d'origine : ce sont les circonstances déclarées, saisies dans le
 * formulaire mobile (§5.1.2 du cahier des charges), et doivent être
 * persistées quelque part sur le dossier.
 */
export type Responsabilite = 'A' | 'B' | 'partagee' | 'indeterminee';
export interface DocumentAbsent {
  conducteur: 'A' | 'B';
  categorie: string;
}

@Entity('dossiers_constat')
export class DossierConstat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz', nullable: true })
  dateAccident: Date | null;

  @Column({ type: 'double precision', nullable: true })
  lat: number | null;

  @Column({ type: 'double precision', nullable: true })
  lng: number | null;

  @Column({ type: 'varchar', length: 20, default: 'brouillon' })
  statut: StatutDossier;

  @Column({ type: 'text', nullable: true })
  pointDeChoc: string | null;

  @Column({ type: 'text', nullable: true })
  conditionsMeteo: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  hashIntegrite: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreation: Date;

  @Column({ type: 'timestamptz', nullable: true })
  dateTransmission: Date | null;

  /** Conducteur ayant créé le dossier depuis l'application (null pour les anciens dossiers). */
  @Column({ type: 'uuid', nullable: true })
  proprietaireId: string | null;

  /**
   * Horodatage RFC 3161 de l'empreinte d'intégrité, délivré par une autorité
   * d'horodatage (TSA_URL) au moment de la transmission.
   */
  @Column({ type: 'text', nullable: true })
  horodatageJeton: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  horodatageDate: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  horodatageAutorite: string | null;

  /** Agent ayant validé / contesté le dossier (dashboard autorités). */
  @Column({ type: 'uuid', nullable: true })
  agentTraitantId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateTraitement: Date | null;

  @Column({ type: 'text', nullable: true })
  commentaireAgent: string | null;

  /** Conclusion de l'autorité à la validation : qui est responsable de l'accident. */
  @Column({ type: 'varchar', length: 15, nullable: true })
  responsabilite: Responsabilite | null;

  /** Part de responsabilité du conducteur A en % (100 = A seul, 0 = B seul). */
  @Column({ type: 'smallint', nullable: true })
  partResponsabiliteA: number | null;

  /** Documents que le conducteur a déclaré ne pas avoir lors de la capture guidée. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  documentsAbsents: DocumentAbsent[];

  @OneToMany(() => VehiculeImplique, (v) => v.dossier, { cascade: true })
  vehiculesImpliques: VehiculeImplique[];

  @OneToMany(() => Media, (m) => m.dossier, { cascade: true })
  medias: Media[];

  @OneToMany(() => Signature, (s) => s.dossier, { cascade: true })
  signatures: Signature[];

  @OneToMany(() => Simulation3D, (s) => s.dossier, { cascade: true })
  simulations3d: Simulation3D[];

  @OneToMany(() => DossierEvenement, (e) => e.dossier, { cascade: true })
  evenements: DossierEvenement[];

  @OneToMany(() => Temoignage, (t) => t.dossier, { cascade: true })
  temoignages: Temoignage[];

  @OneToMany(() => TransmissionAssureur, (t) => t.dossier, { cascade: true })
  transmissionsAssureurs: TransmissionAssureur[];
}

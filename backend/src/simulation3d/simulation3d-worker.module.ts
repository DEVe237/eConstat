import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyseIA } from '../analyse-ia/analyse-ia.entity';
import { DossierConstat } from '../dossiers/entities/dossier-constat.entity';
import { DossierEvenement } from '../dossiers/entities/dossier-evenement.entity';
import { Temoignage } from '../dossiers/entities/temoignage.entity';
import { TransmissionAssureur } from '../dossiers/entities/transmission-assureur.entity';
import { Media } from '../dossiers/entities/media.entity';
import { Signature } from '../dossiers/entities/signature.entity';
import { VehiculeImplique } from '../dossiers/entities/vehicule-implique.entity';
import { Simulation3D } from './entities/simulation3d.entity';
import { MinioService } from './minio.service';
import { SceneBuilderService } from './scene-builder.service';
import { Simulation3dProcessor } from './simulation3d.processor';

/**
 * Module chargé uniquement par le process worker (`worker.ts`) : consomme la
 * file BullMQ `simulation3d` et produit les vidéos (cahier de conception
 * §3.2 — "processus séparé qui consomme les tâches de la file d'attente").
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Simulation3D,
      AnalyseIA,
      DossierConstat,
      VehiculeImplique,
      Media,
      Signature,
      DossierEvenement,
      Temoignage,
      TransmissionAssureur,
    ]),
    BullModule.registerQueue({ name: 'simulation3d' }),
  ],
  providers: [SceneBuilderService, MinioService, Simulation3dProcessor],
})
export class Simulation3dWorkerModule {}

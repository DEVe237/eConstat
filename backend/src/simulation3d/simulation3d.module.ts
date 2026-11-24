import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyseIA } from '../analyse-ia/analyse-ia.entity';
import { DossierConstat } from '../dossiers/entities/dossier-constat.entity';
import { VehiculeImplique } from '../dossiers/entities/vehicule-implique.entity';
import { Simulation3D } from './entities/simulation3d.entity';
import { SceneBuilderService } from './scene-builder.service';
import { Simulation3dController } from './simulation3d.controller';
import { Simulation3dService } from './simulation3d.service';

/**
 * Côté API : déclenche des générations (producteur de la file BullMQ) et
 * expose le statut/la scène. Le traitement effectif (le `@Processor`) vit
 * dans `Simulation3dWorkerModule`, chargé uniquement par `worker.ts` — sinon
 * l'API traiterait aussi des jobs en plus du worker dédié.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyseIA, Simulation3D, DossierConstat, VehiculeImplique]),
    BullModule.registerQueue({ name: 'simulation3d' }),
  ],
  controllers: [Simulation3dController],
  providers: [Simulation3dService, SceneBuilderService],
})
export class Simulation3dModule {}

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { connexionPostgres, connexionRedis } from './common/configuration';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Simulation3dWorkerModule } from './simulation3d/simulation3d-worker.module';

/**
 * Racine du process worker : mêmes connexions Postgres/Redis que l'API
 * (`app.module.ts`) mais uniquement les modules nécessaires au traitement
 * des jobs de reconstitution 3D — pas de contrôleurs HTTP, pas d'auth.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...connexionPostgres(config),
        autoLoadEntities: true,
        // Seule l'API fait évoluer le schéma : un worker resté sur une ancienne
        // version supprimerait sinon les colonnes qu'il ne connaît pas encore.
        synchronize: false,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: connexionRedis(config),
      }),
    }),
    Simulation3dWorkerModule,
  ],
})
export class WorkerModule {}

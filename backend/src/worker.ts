import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

/**
 * Point d'entrée du worker de génération 3D — pas de serveur HTTP, juste le
 * contexte Nest pour que le `@Processor('simulation3d')` consomme la file
 * BullMQ (cahier de conception §3.2). Déployé comme conteneur séparé
 * (`Dockerfile.worker`), même code source que l'API.
 */
async function bootstrap() {
  // Worker intégré (WORKER_INTEGRE) : s'arrête avec l'API qui l'a lancé.
  process.on('disconnect', () => process.exit(0));
  await NestFactory.createApplicationContext(WorkerModule);
  Logger.log('Worker simulation3d démarré, en attente de tâches', 'Bootstrap');
}
bootstrap();

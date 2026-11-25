import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { fork } from 'child_process';
import { join } from 'path';
import { AppModule } from './app.module';

/**
 * WORKER_INTEGRE=true : le worker 3D tourne dans un processus enfant du même
 * conteneur (hébergement à un seul service, volume partagé avec l'API). Lancé
 * après l'API, qui met à jour le schéma de la base.
 */
function lancerWorker() {
  const enfant = fork(join(__dirname, 'worker.js'));
  enfant.on('exit', (code) => {
    Logger.error(`Worker 3D arrêté (code ${code}), relance dans 10 s`, 'Bootstrap');
    setTimeout(lancerWorker, 10_000);
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  // Les signatures arrivent en PNG base64 dans le corps JSON : la limite par défaut (100 Ko) est trop basse.
  app.useBodyParser('json', { limit: '5mb' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Les photos et signatures ne sont plus publiques : elles passent par /fichiers (liens signés).
  app.useStaticAssets(join(process.cwd(), 'public'), { prefix: '/' });

  // Documentation interactive de l'API : http://localhost:3000/docs
  const config = new DocumentBuilder()
    .setTitle('eConstat API')
    .setDescription('API du constat amiable numérique : application mobile, reconstitution 3D et dashboard des autorités.')
    .setVersion('0.2.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
  // Le dashboard réutilise ses connexions : ne pas les fermer avant lui (5 s par défaut).
  const serveur = app.getHttpServer();
  serveur.keepAliveTimeout = 65_000;
  serveur.headersTimeout = 66_000;
  if (process.env.WORKER_INTEGRE === 'true') lancerWorker();
}
bootstrap();

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import puppeteer from 'puppeteer';
import { Repository } from 'typeorm';
import { createServer, Server } from 'http';
import { createReadStream, existsSync, statSync } from 'fs';
import { extname } from 'path';
import { AnalyseIA } from '../analyse-ia/analyse-ia.entity';
import { DossierConstat } from '../dossiers/entities/dossier-constat.entity';
import { VehiculeImplique } from '../dossiers/entities/vehicule-implique.entity';
import { Simulation3D } from './entities/simulation3d.entity';
import { MinioService } from './minio.service';
import { SceneBuilderService } from './scene-builder.service';

export interface Simulation3DJobData {
  simulationId: string;
  dossierId: string;
}

/**
 * Consomme la file `simulation3d` (BullMQ) et produit une vidéo MP4 de la
 * reconstitution (cahier de conception §6.3 — "Worker Node.js (headless)").
 *
 * Le document nomme `headless-gl`. On utilise ici Puppeteer + Chromium en
 * rendu logiciel (SwiftShader) à la place : même principe (rendu WebGL
 * headless côté serveur), mécanisme nettement plus robuste à faire tourner
 * en conteneur — `headless-gl` est un binding natif ancien et fragile.
 */
@Processor('simulation3d')
export class Simulation3dProcessor extends WorkerHost {
  private readonly logger = new Logger(Simulation3dProcessor.name);
  private staticServer: Server | null = null;
  private staticServerPort = 0;

  constructor(
    @InjectRepository(Simulation3D)
    private readonly simulationsRepo: Repository<Simulation3D>,
    @InjectRepository(DossierConstat)
    private readonly dossiersRepo: Repository<DossierConstat>,
    @InjectRepository(VehiculeImplique)
    private readonly vehiculesRepo: Repository<VehiculeImplique>,
    @InjectRepository(AnalyseIA)
    private readonly analysesRepo: Repository<AnalyseIA>,
    private readonly sceneBuilder: SceneBuilderService,
    private readonly minio: MinioService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<Simulation3DJobData>): Promise<void> {
    const { simulationId, dossierId } = job.data;
    this.logger.log(`Génération 3D démarrée pour le dossier ${dossierId}`);
    await this.simulationsRepo.update(simulationId, { statut: 'en_cours' });

    let dossierTemp: string | null = null;
    try {
      const dossier = await this.dossiersRepo.findOneOrFail({
        where: { id: dossierId },
      });
      const vehicules = await this.vehiculesRepo.find({ where: { dossierId }, order: { dateAjout: 'ASC' } });
      const analyse = await this.analysesRepo.findOne({ where: { dossierId, statut: 'terminee' }, order: { dateCreation: 'DESC' } });

      const fps = this.config.get<number>('SIMULATION3D_FPS', 24);
      const dureeSecondes = this.config.get<number>(
        'SIMULATION3D_DUREE_SECONDES',
        20,
      );
      const scene = this.sceneBuilder.build(dossier, vehicules, dureeSecondes, analyse?.resultat);

      dossierTemp = await mkdtemp(join(tmpdir(), 'simulation3d-'));
      const frameCount = Math.round(dureeSecondes * fps);

      await this.ensureStaticServer();
      const framesDir = dossierTemp;
      await this.capturerFrames(scene, frameCount, fps, framesDir);

      const videoPath = join(dossierTemp, 'out.mp4');
      await this.encoderVideo(framesDir, fps, videoPath);

      const objectName = `${dossierId}/${simulationId}.mp4`;
      const url = await this.minio.upload(objectName, videoPath);

      await this.simulationsRepo.update(simulationId, {
        statut: 'termine',
        urlAnimation: url,
        dateGeneration: new Date(),
        erreur: null,
      });
      this.logger.log(`Génération 3D terminée pour le dossier ${dossierId}`);
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Échec génération 3D dossier ${dossierId}: ${message}`);
      await this.simulationsRepo.update(simulationId, {
        statut: 'echec',
        erreur: message,
      });
    } finally {
      if (dossierTemp) await rm(dossierTemp, { recursive: true, force: true });
    }
  }

  /**
   * Sert `public/simulation3d` en local pour que Puppeteer puisse charger
   * `scene.html` sans dépendre de la disponibilité de l'API NestJS (le
   * worker doit rester autonome, cf. plan §"processus séparé").
   */
  private async ensureStaticServer(): Promise<void> {
    if (this.staticServer) return;
    const publicDir = join(process.cwd(), 'public');
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.json': 'application/json',
    };
    this.staticServer = createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
      const filePath = join(publicDir, urlPath);
      if (!filePath.startsWith(publicDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
      });
      createReadStream(filePath).pipe(res);
    });
    await new Promise<void>((resolve) => {
      this.staticServer!.listen(0, '127.0.0.1', () => {
        const address = this.staticServer!.address();
        this.staticServerPort =
          typeof address === 'object' && address ? address.port : 0;
        resolve();
      });
    });
  }

  private async capturerFrames(
    scene: ReturnType<SceneBuilderService['build']>,
    frameCount: number,
    fps: number,
    outDir: string,
  ): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--no-sandbox',
      ],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 960, height: 540 });
      await page.evaluateOnNewDocument((data) => {
        (window as unknown as { __sceneData: unknown }).__sceneData = data;
      }, scene as unknown);
      await page.goto(
        `http://127.0.0.1:${this.staticServerPort}/simulation3d/scene.html`,
        { waitUntil: 'load' },
      );
      await page.waitForFunction('window.__sceneReady === true', {
        timeout: 15000,
      });

      for (let i = 0; i < frameCount; i++) {
        const t = i / fps;
        await page.evaluate((tSeconds) => {
          (window as unknown as { seekTo: (t: number) => void }).seekTo(
            tSeconds,
          );
        }, t);
        const frameName = `frame_${String(i).padStart(5, '0')}.png`;
        await page.screenshot({ path: join(outDir, frameName) as `${string}.png` });
      }
    } finally {
      await browser.close();
    }
  }

  private encoderVideo(
    framesDir: string,
    fps: number,
    outPath: string,
  ): Promise<void> {
    const ffmpegBin: string | null = ffmpegPath;
    if (!ffmpegBin) {
      return Promise.reject(new Error('Binaire ffmpeg introuvable (ffmpeg-static)'));
    }
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-framerate',
        String(fps),
        '-i',
        join(framesDir, 'frame_%05d.png'),
        '-pix_fmt',
        'yuv420p',
        outPath,
      ];
      const proc = spawn(ffmpegBin, args);
      let stderr = '';
      proc.stderr.on('data', (chunk) => (stderr += chunk.toString()));
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg a échoué (code ${code}): ${stderr.slice(-500)}`));
      });
    });
  }
}

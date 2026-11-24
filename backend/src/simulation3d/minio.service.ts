import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { copyFile, mkdir } from 'fs/promises';
import * as Minio from 'minio';
import { dirname, join } from 'path';

/**
 * Stockage des animations 3D exportées (cahier de conception §2.3 — MinIO,
 * S3-compatible). Bucket en lecture publique pour simplifier la lecture
 * directe des vidéos depuis la WebView mobile en développement.
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get('MINIO_BUCKET', 'simulations3d');
    this.client = new Minio.Client({
      endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
      port: this.config.get<number>('MINIO_PORT', 9000),
      useSSL: false,
      accessKey: this.config.get('MINIO_ACCESS_KEY', 'camaircost'),
      secretKey: this.config.get('MINIO_SECRET_KEY', 'camaircost_dev_minio'),
    });
  }

  /** STOCKAGE_VIDEOS=local : vidéos rangées avec les pièces du dossier, servies par lien signé (sans MinIO). */
  private get local(): boolean {
    return this.config.get<string>('STOCKAGE_VIDEOS') === 'local';
  }

  async onModuleInit(): Promise<void> {
    if (this.local) return;
    await this.ensureBucket();
  }

  async ensureBucket(): Promise<void> {
    try {
      const existe = await this.client.bucketExists(this.bucket);
      if (!existe) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Bucket MinIO "${this.bucket}" créé`);
      }
      const politique = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(this.bucket, JSON.stringify(politique));
    } catch (err) {
      this.logger.warn(
        `MinIO indisponible au démarrage (${(err as Error).message}) — nouvelle tentative à la prochaine génération`,
      );
    }
  }

  async upload(objectName: string, filePath: string): Promise<string> {
    if (this.local) {
      const relatif = `simulations/${objectName}`;
      const cible = join(process.cwd(), 'uploads', relatif);
      await mkdir(dirname(cible), { recursive: true });
      await copyFile(filePath, cible);
      return `/uploads/${relatif}`;
    }
    await this.ensureBucket();
    await this.client.fPutObject(this.bucket, objectName, filePath, {
      'Content-Type': 'video/mp4',
    });
    return this.getUrl(objectName);
  }

  /**
   * L'URL stockée/renvoyée aux clients doit être joignable depuis l'app
   * mobile et le navigateur (host mappé, ex. `localhost:9000`), qui diffère
   * du host interne utilisé par le worker pour se connecter à MinIO à
   * l'intérieur du réseau Docker (ex. `minio:9000`).
   */
  getUrl(objectName: string): string {
    const endpoint = this.config.get('MINIO_PUBLIC_ENDPOINT', 'localhost');
    const port = this.config.get<number>('MINIO_PUBLIC_PORT', 9000);
    return `http://${endpoint}:${port}/${this.bucket}/${objectName}`;
  }
}

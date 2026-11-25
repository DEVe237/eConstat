import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash, randomUUID } from 'crypto';
import type { Request } from 'express';
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFile } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mesurerDureeVideo } from '../common/duree-video';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { CreateSignatureDto } from './dto/create-signature.dto';
import { AjoutMediaQuery, DocumentsAbsentsDto, VehiculesDto } from './dto/capture-guidee.dto';
import { CreateVehiculeDto } from './dto/create-vehicule.dto';
import { DossiersService } from './dossiers.service';

const UPLOADS_ROOT = join(process.cwd(), 'uploads');
const TYPES_ACCEPTES = /^(image\/(jpeg|png|webp|heic|heif)|video\/(mp4|quicktime|3gpp|webm))$/;

type RequeteAuth = Request & { user: JwtPayload };

const empreinteFichier = (chemin: string) =>
  new Promise<string>((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(chemin)
      .on('data', (c) => h.update(c))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject);
  });

/** Routes de l'application mobile : chaque conducteur n'accède qu'à ses propres dossiers. */
@ApiTags('Dossiers (application mobile)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dossiers')
export class DossiersController {
  constructor(private readonly dossiersService: DossiersService) {}

  @Post()
  create(@Body() dto: CreateDossierDto, @Req() req: RequeteAuth) {
    return this.dossiersService.create(dto, req.user);
  }

  @Get()
  findAll(@Req() req: RequeteAuth) {
    return this.dossiersService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequeteAuth) {
    return this.dossiersService.findOne(id, req.user);
  }

  /** Avancement du traitement, relu régulièrement par l'application pour un suivi en direct. */
  @Get(':id/suivi')
  suivi(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequeteAuth) {
    return this.dossiersService.suivi(id, req.user);
  }

  /** Complète les circonstances d'un brouillon (le dossier est créé dès la fin de la capture guidée). */
  @Patch(':id')
  mettreAJour(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateDossierDto, @Req() req: RequeteAuth) {
    return this.dossiersService.mettreAJour(id, dto, req.user);
  }

  @Post(':id/vehicules')
  addVehicule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateVehiculeDto, @Req() req: RequeteAuth) {
    return this.dossiersService.addVehicule(id, dto, req.user);
  }

  /** Remplace tous les véhicules : un renvoi après une coupure réseau ne crée pas de doublon. */
  @Put(':id/vehicules')
  remplacerVehicules(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VehiculesDto, @Req() req: RequeteAuth) {
    return this.dossiersService.remplacerVehicules(id, dto.vehicules, req.user);
  }

  @Post(':id/media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const dir = join(UPLOADS_ROOT, req.params.id as string);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 200 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        TYPES_ACCEPTES.test(file.mimetype) || file.mimetype === 'application/octet-stream'
          ? cb(null, true)
          : cb(new BadRequestException('Seules les photos et vidéos sont acceptées'), false),
    }),
  )
  async addMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: AjoutMediaQuery,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequeteAuth,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    try {
      // Contrôle d'accès avant tout traitement du fichier.
      await this.dossiersService.getBrouillonOrFail(id, req.user);
      if (q.categorie === 'video_tour') q.duree = await this.dureeReelle(file.path);
      const empreinte = await empreinteFichier(file.path);
      return await this.dossiersService.addMedia(id, q, `/uploads/${id}/${file.filename}`, empreinte, req.user);
    } catch (err) {
      // Refus (dossier d'un autre, déjà transmis…) : le fichier reçu n'est pas conservé.
      unlinkSync(file.path);
      throw err;
    }
  }

  private async dureeReelle(chemin: string): Promise<number> {
    let duree: number | null;
    try {
      duree = await mesurerDureeVideo(chemin);
    } catch {
      throw new ServiceUnavailableException('Contrôle de la vidéo indisponible, réessayez plus tard');
    }
    if (duree === null) throw new BadRequestException('Le fichier envoyé n’est pas une vidéo lisible');
    return Math.round(duree * 10) / 10;
  }

  @Post(':id/signature')
  addSignature(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateSignatureDto, @Req() req: RequeteAuth) {
    return this.dossiersService.addSignature(id, dto, req.user, async (bytes) => {
      const dir = join(UPLOADS_ROOT, id, 'signatures');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const filename = `${randomUUID()}.png`;
      await new Promise<void>((resolve, reject) => {
        writeFile(join(dir, filename), bytes, (err) => (err ? reject(err) : resolve()));
      });
      return `/uploads/${id}/signatures/${filename}`;
    });
  }

  /**
   * Pièces que le conducteur a déclaré ne pas avoir (« Je n'ai pas ce document »),
   * remplace la liste entière.
   */
  @Put(':id/documents-absents')
  documentsAbsents(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DocumentsAbsentsDto, @Req() req: RequeteAuth) {
    return this.dossiersService.definirDocumentsAbsents(id, dto.documents, req.user);
  }

  @Post(':id/soumettre')
  soumettre(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequeteAuth) {
    return this.dossiersService.soumettre(id, req.user);
  }
}

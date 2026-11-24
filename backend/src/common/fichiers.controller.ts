import { Controller, ForbiddenException, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { existsSync, statSync } from 'fs';
import { join, normalize, sep } from 'path';
import { LiensSignesService } from './liens-signes.service';

const UPLOADS_ROOT = join(process.cwd(), 'uploads');

/**
 * Sert les photos, vidéos et signatures uniquement via un lien signé
 * (les fichiers ne sont plus publics sous /uploads).
 */
@ApiExcludeController()
@Controller('fichiers')
export class FichiersController {
  constructor(private readonly liens: LiensSignesService) {}

  @Get('*chemin')
  servir(@Param('chemin') chemin: string[] | string, @Query('exp') exp: string, @Query('sig') sig: string, @Res() res: Response) {
    const relatif = Array.isArray(chemin) ? chemin.join('/') : chemin;
    if (!this.liens.verifier(`/fichiers/${relatif}`, exp, sig)) {
      throw new ForbiddenException('Lien invalide ou expiré');
    }
    const absolu = normalize(join(UPLOADS_ROOT, relatif));
    if (!absolu.startsWith(UPLOADS_ROOT + sep) || !existsSync(absolu) || !statSync(absolu).isFile()) {
      throw new NotFoundException('Fichier introuvable');
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(absolu);
  }
}

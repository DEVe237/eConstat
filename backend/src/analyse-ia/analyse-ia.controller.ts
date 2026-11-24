import { Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { AnalyseIaService } from './analyse-ia.service';

type RequeteAuth = Request & { user: JwtPayload };

@ApiTags('analyse-ia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dossiers/:id/analyse-ia')
export class AnalyseIaController {
  constructor(private readonly analyses: AnalyseIaService) {}

  /**
   * Analyse les photos du dossier (plaques, dégâts, zone de choc, route, météo)
   * pour pré-remplir le formulaire et affiner la reconstitution 3D.
   * Statut "indisponible" si aucune clé d'API IA n'est configurée.
   */
  @Post()
  analyser(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequeteAuth) {
    return this.analyses.analyser(id, req.user);
  }

  /** Dernière analyse du dossier (null si aucune). */
  @Get()
  async derniere(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequeteAuth) {
    return { disponible: this.analyses.disponible, analyse: await this.analyses.derniere(id, req.user) };
  }
}

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { LiensSignesService } from '../common/liens-signes.service';
import { Simulation3dService } from './simulation3d.service';

type RequeteAuth = Request & { user: JwtPayload };

@ApiTags('Reconstitution 3D')
@Controller('dossiers')
export class Simulation3dController {
  constructor(
    private readonly simulation3dService: Simulation3dService,
    private readonly liens: LiensSignesService,
  ) {}

  @Post(':id/simulation3d')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  declencher(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequeteAuth) {
    return this.simulation3dService.declencher(id, req.user);
  }

  @Get(':id/simulation3d')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  statut(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequeteAuth) {
    return this.simulation3dService.statut(id, req.user);
  }

  /**
   * Données de la scène pour la visionneuse (WebView mobile, iframe du
   * dashboard) : accès par le lien signé `sceneUrl` renvoyé par la route
   * de statut ou le détail du dossier.
   */
  @Get(':id/simulation3d/scene')
  scene(@Param('id', ParseUUIDPipe) id: string, @Query('exp') exp: string, @Query('sig') sig: string) {
    if (!this.liens.verifier(`/dossiers/${id}/simulation3d/scene`, exp, sig)) {
      throw new ForbiddenException('Lien de visualisation invalide ou expiré');
    }
    return this.simulation3dService.scene(id);
  }
}

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DashboardService } from './dashboard.service';
import { MotifDto, ValiderDto } from './dto/decision.dto';
import { ListeDossiersQuery } from './dto/liste-dossiers.query';
import { TemoignageDto, TransmissionAssureurDto } from './dto/temoignage.dto';
import { ExportPdfService } from './export-pdf.service';

type RequeteAuth = Request & { user: JwtPayload };

/**
 * Dashboard (cahier des charges §5.4). Agents et administrateurs traitent
 * les dossiers ; les assureurs consultent en lecture seule ceux qui ont été
 * transmis à leur compagnie.
 */
@ApiTags('Dashboard autorités')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('agent', 'administrateur')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly exportPdf: ExportPdfService,
  ) {}

  @Get('dossiers')
  @Roles('agent', 'administrateur', 'assureur')
  lister(@Query() query: ListeDossiersQuery, @Req() req: RequeteAuth) {
    return this.dashboard.lister(query, req.user);
  }

  @Get('dossiers/:id')
  @Roles('agent', 'administrateur', 'assureur')
  detail(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequeteAuth) {
    return this.dashboard.detail(id, req.user);
  }

  @Get('dossiers/:id/export.pdf')
  @Roles('agent', 'administrateur', 'assureur')
  async exporter(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequeteAuth) {
    const { pdf, nomFichier } = await this.exportPdf.generer(id, req.user);
    return new StreamableFile(pdf, { type: 'application/pdf', disposition: `attachment; filename="${nomFichier}"` });
  }

  /** Preuve d'horodatage RFC 3161 (`openssl ts -reply -in fichier.tsr -text`). */
  @Get('dossiers/:id/horodatage.tsr')
  @Roles('agent', 'administrateur', 'assureur')
  async horodatage(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequeteAuth) {
    const { der, numero } = await this.dashboard.jetonHorodatage(id, req.user);
    return new StreamableFile(der, { type: 'application/timestamp-reply', disposition: `attachment; filename="horodatage-${numero.slice(1)}.tsr"` });
  }

  @Post('dossiers/:id/valider')
  valider(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ValiderDto, @Req() req: RequeteAuth) {
    return this.dashboard.valider(id, req.user, dto);
  }

  @Post('dossiers/:id/contester')
  contester(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MotifDto, @Req() req: RequeteAuth) {
    return this.dashboard.contester(id, req.user, dto.commentaire);
  }

  @Post('dossiers/:id/completer')
  completer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MotifDto, @Req() req: RequeteAuth) {
    return this.dashboard.completer(id, req.user, dto.commentaire);
  }

  /** Témoignage d'un tiers recueilli par un agent (EF-09). */
  @Post('dossiers/:id/temoignages')
  temoignage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TemoignageDto, @Req() req: RequeteAuth) {
    return this.dashboard.ajouterTemoignage(id, req.user, dto);
  }

  /** Transmission à une compagnie d'assurance (EF-10). */
  @Post('dossiers/:id/transmettre-assureur')
  transmettreAssureur(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TransmissionAssureurDto, @Req() req: RequeteAuth) {
    return this.dashboard.transmettreAssureur(id, req.user, dto.compagnie);
  }

  @Get('assureurs')
  compagnies() {
    return this.dashboard.compagnies();
  }

  @Get('statistiques')
  statistiques() {
    return this.dashboard.statistiques();
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DossierConstat } from '../dossiers/entities/dossier-constat.entity';
import { DossierEvenement } from '../dossiers/entities/dossier-evenement.entity';
import { Temoignage } from '../dossiers/entities/temoignage.entity';
import { TransmissionAssureur } from '../dossiers/entities/transmission-assureur.entity';
import { AnalyseIaModule } from '../analyse-ia/analyse-ia.module';
import { UsersModule } from '../users/users.module';
import { AdminUtilisateursController } from './admin-utilisateurs.controller';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ExportPdfService } from './export-pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([DossierConstat, DossierEvenement, Temoignage, TransmissionAssureur]), UsersModule, AnalyseIaModule],
  controllers: [DashboardController, AdminUtilisateursController],
  providers: [DashboardService, ExportPdfService],
})
export class DashboardModule {}

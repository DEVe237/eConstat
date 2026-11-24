import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DossierConstat } from '../dossiers/entities/dossier-constat.entity';
import { Media } from '../dossiers/entities/media.entity';
import { AnalyseIaController } from './analyse-ia.controller';
import { AnalyseIA } from './analyse-ia.entity';
import { AnalyseIaService } from './analyse-ia.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnalyseIA, DossierConstat, Media])],
  controllers: [AnalyseIaController],
  providers: [AnalyseIaService],
  exports: [AnalyseIaService],
})
export class AnalyseIaModule {}

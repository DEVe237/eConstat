import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';
import { DossierConstat } from './entities/dossier-constat.entity';
import { Media } from './entities/media.entity';
import { Temoignage } from './entities/temoignage.entity';
import { TransmissionAssureur } from './entities/transmission-assureur.entity';
import { DossierEvenement } from './entities/dossier-evenement.entity';
import { Signature } from './entities/signature.entity';
import { VehiculeImplique } from './entities/vehicule-implique.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DossierConstat,
      VehiculeImplique,
      Media,
      Signature,
      DossierEvenement,
      Temoignage,
      TransmissionAssureur,
    ]),
  ],
  controllers: [DossiersController],
  providers: [DossiersService],
})
export class DossiersModule {}

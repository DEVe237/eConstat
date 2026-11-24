import { Global, Module } from '@nestjs/common';
import { FichiersController } from './fichiers.controller';
import { HorodatageService } from './horodatage.service';
import { LiensSignesService } from './liens-signes.service';

@Global()
@Module({
  controllers: [FichiersController],
  providers: [LiensSignesService, HorodatageService],
  exports: [LiensSignesService, HorodatageService],
})
export class CommonModule {}

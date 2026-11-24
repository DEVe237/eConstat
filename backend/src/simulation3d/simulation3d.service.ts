import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { AnalyseIA } from '../analyse-ia/analyse-ia.entity';
import type { JwtPayload } from '../auth/jwt.strategy';
import { LiensSignesService } from '../common/liens-signes.service';
import { DossiersService } from '../dossiers/dossiers.service';
import { DossierConstat } from '../dossiers/entities/dossier-constat.entity';
import { VehiculeImplique } from '../dossiers/entities/vehicule-implique.entity';
import { Simulation3D } from './entities/simulation3d.entity';
import { Scene3D, SceneBuilderService } from './scene-builder.service';
import type { Simulation3DJobData } from './simulation3d.processor';

@Injectable()
export class Simulation3dService {
  constructor(
    @InjectRepository(Simulation3D)
    private readonly simulationsRepo: Repository<Simulation3D>,
    @InjectRepository(DossierConstat)
    private readonly dossiersRepo: Repository<DossierConstat>,
    @InjectRepository(VehiculeImplique)
    private readonly vehiculesRepo: Repository<VehiculeImplique>,
    @InjectRepository(AnalyseIA)
    private readonly analysesRepo: Repository<AnalyseIA>,
    private readonly sceneBuilder: SceneBuilderService,
    private readonly liens: LiensSignesService,
    @InjectQueue('simulation3d') private readonly queue: Queue<Simulation3DJobData>,
  ) {}

  /** Sans `user` : accès déjà autorisé par un lien signé (visionneuse 3D). */
  private async getDossierOrFail(dossierId: string, user?: JwtPayload): Promise<DossierConstat> {
    const dossier = await this.dossiersRepo.findOne({ where: { id: dossierId } });
    if (!dossier || (user && !DossiersService.peutLire(dossier, user))) {
      throw new NotFoundException(`Dossier ${dossierId} introuvable`);
    }
    return dossier;
  }

  async declencher(dossierId: string, user: JwtPayload): Promise<Simulation3D & { sceneUrl: string }> {
    await this.getDossierOrFail(dossierId, user);
    const simulation = await this.simulationsRepo.save(
      this.simulationsRepo.create({ dossierId, statut: 'en_attente' }),
    );
    await this.queue.add('generer', {
      simulationId: simulation.id,
      dossierId,
    });
    return { ...simulation, sceneUrl: this.liens.scene(dossierId) };
  }

  /** Dernière génération, avec un lien signé vers la visionneuse 3D interactive. */
  async statut(dossierId: string, user: JwtPayload): Promise<Simulation3D & { sceneUrl: string }> {
    await this.getDossierOrFail(dossierId, user);
    const derniere = await this.simulationsRepo.findOne({
      where: { dossierId },
      order: { dateDemande: 'DESC' },
    });
    if (!derniere) {
      throw new NotFoundException(
        `Aucune génération 3D pour le dossier ${dossierId}`,
      );
    }
    return { ...derniere, urlAnimation: this.liens.fichier(derniere.urlAnimation), sceneUrl: this.liens.scene(dossierId) };
  }

  async scene(dossierId: string): Promise<Scene3D> {
    const dossier = await this.getDossierOrFail(dossierId);
    const vehicules = await this.vehiculesRepo.find({ where: { dossierId }, order: { dateAjout: 'ASC' } });
    const analyse = await this.analysesRepo.findOne({ where: { dossierId, statut: 'terminee' }, order: { dateCreation: 'DESC' } });
    return this.sceneBuilder.build(dossier, vehicules, 20, analyse?.resultat);
  }
}

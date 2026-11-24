import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { IsNull, Repository } from 'typeorm';
import type { JwtPayload } from '../auth/jwt.strategy';
import { HorodatageService } from '../common/horodatage.service';
import { LiensSignesService } from '../common/liens-signes.service';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { CreateSignatureDto } from './dto/create-signature.dto';
import { CreateVehiculeDto } from './dto/create-vehicule.dto';
import { DocumentAbsent, DossierConstat } from './entities/dossier-constat.entity';
import { DossierEvenement } from './entities/dossier-evenement.entity';
import { CATEGORIES_DOCUMENT, DUREE_VIDEO_TOUR, Media } from './entities/media.entity';
import { AjoutMediaQuery } from './dto/capture-guidee.dto';
import { Signature } from './entities/signature.entity';
import { VehiculeImplique } from './entities/vehicule-implique.entity';

const AUTORITES = ['agent', 'administrateur'];

@Injectable()
export class DossiersService {
  constructor(
    @InjectRepository(DossierConstat)
    private readonly dossiersRepo: Repository<DossierConstat>,
    @InjectRepository(VehiculeImplique)
    private readonly vehiculesRepo: Repository<VehiculeImplique>,
    @InjectRepository(Media)
    private readonly mediasRepo: Repository<Media>,
    @InjectRepository(Signature)
    private readonly signaturesRepo: Repository<Signature>,
    @InjectRepository(DossierEvenement)
    private readonly evenementsRepo: Repository<DossierEvenement>,
    private readonly liens: LiensSignesService,
    private readonly horodatage: HorodatageService,
  ) {}

  /** Le conducteur qui a créé le dossier, ou les autorités. */
  static peutLire(dossier: DossierConstat, user: JwtPayload): boolean {
    return dossier.proprietaireId === user.sub || AUTORITES.includes(user.role);
  }

  async create(dto: CreateDossierDto, user: JwtPayload): Promise<DossierConstat> {
    const dossier = this.dossiersRepo.create({
      proprietaireId: user.sub,
      dateAccident: dto.dateAccident ? new Date(dto.dateAccident) : null,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      pointDeChoc: dto.pointDeChoc ?? null,
      conditionsMeteo: dto.conditionsMeteo ?? null,
    });
    const cree = await this.dossiersRepo.save(dossier);
    await this.evenementsRepo.save(this.evenementsRepo.create({ dossierId: cree.id, type: 'creation', auteurId: user.sub }));
    return cree;
  }

  /** Historique du conducteur : uniquement ses propres dossiers. */
  findAll(user: JwtPayload): Promise<DossierConstat[]> {
    return this.dossiersRepo.find({
      where: { proprietaireId: user.sub },
      order: { dateCreation: 'DESC', vehiculesImpliques: { dateAjout: 'ASC' } },
      relations: ['vehiculesImpliques'],
    });
  }

  async findOne(id: string, user: JwtPayload): Promise<DossierConstat> {
    const dossier = await this.dossiersRepo.findOne({
      where: { id },
      relations: ['vehiculesImpliques', 'medias', 'signatures'],
      // Le premier véhicule est A, le second B.
      order: { vehiculesImpliques: { dateAjout: 'ASC' }, medias: { horodatage: 'ASC' } },
    });
    // 404 plutôt que 403 : on ne révèle pas l'existence d'un dossier qui n'est pas le sien.
    if (!dossier || !DossiersService.peutLire(dossier, user)) throw new NotFoundException(`Dossier ${id} introuvable`);
    return this.signerLiens(dossier);
  }

  /** Les fichiers ne sont servis que par liens signés à durée limitée. */
  signerLiens<T extends { medias?: Media[]; signatures?: Signature[] }>(dossier: T): T {
    dossier.medias?.forEach((m) => (m.url = this.liens.fichier(m.url)!));
    dossier.signatures?.forEach((s) => (s.imageUrl = this.liens.fichier(s.imageUrl)!));
    return dossier;
  }

  /**
   * Un dossier ne se modifie qu'à l'état de brouillon, et seulement par le
   * conducteur qui l'a créé : une fois transmis, son empreinte d'intégrité
   * est calculée et il est entre les mains des autorités.
   */
  async getBrouillonOrFail(id: string, user: JwtPayload): Promise<DossierConstat> {
    const dossier = await this.dossiersRepo.findOne({ where: { id } });
    if (!dossier || dossier.proprietaireId !== user.sub) throw new NotFoundException(`Dossier ${id} introuvable`);
    if (dossier.statut !== 'brouillon') {
      throw new ConflictException('Ce dossier a déjà été transmis et ne peut plus être modifié');
    }
    return dossier;
  }

  async mettreAJour(id: string, dto: CreateDossierDto, user: JwtPayload): Promise<DossierConstat> {
    const dossier = await this.getBrouillonOrFail(id, user);
    if (dto.dateAccident !== undefined) dossier.dateAccident = new Date(dto.dateAccident);
    if (dto.lat !== undefined) dossier.lat = dto.lat;
    if (dto.lng !== undefined) dossier.lng = dto.lng;
    if (dto.pointDeChoc !== undefined) dossier.pointDeChoc = dto.pointDeChoc;
    if (dto.conditionsMeteo !== undefined) dossier.conditionsMeteo = dto.conditionsMeteo;
    return this.dossiersRepo.save(dossier);
  }

  async addVehicule(dossierId: string, dto: CreateVehiculeDto, user: JwtPayload): Promise<VehiculeImplique> {
    await this.getBrouillonOrFail(dossierId, user);
    const vehicule = this.vehiculesRepo.create({ ...dto, dossierId });
    return this.vehiculesRepo.save(vehicule);
  }

  async remplacerVehicules(dossierId: string, dtos: CreateVehiculeDto[], user: JwtPayload): Promise<VehiculeImplique[]> {
    await this.getBrouillonOrFail(dossierId, user);
    return this.vehiculesRepo.manager.transaction(async (em) => {
      await em.delete(VehiculeImplique, { dossierId });
      // Une date par véhicule : l'ordre A puis B en dépend.
      const base = Date.now();
      return em.save(dtos.map((dto, i) => em.create(VehiculeImplique, { ...dto, dossierId, dateAjout: new Date(base + i) })));
    });
  }

  async addMedia(dossierId: string, q: AjoutMediaQuery, url: string, empreinte: string, user: JwtPayload): Promise<Media> {
    await this.getBrouillonOrFail(dossierId, user);
    const categorie = q.categorie ?? 'libre';
    if (categorie === 'video_tour' && q.type !== 'video') throw new BadRequestException('Le tour des véhicules doit être une vidéo');
    if (categorie !== 'video_tour' && categorie !== 'libre' && q.type !== 'photo') {
      throw new BadRequestException(`La catégorie ${categorie} attend une photo`);
    }
    if (categorie === 'video_tour') {
      // Tolérance d'une seconde : l'enregistrement s'arrête rarement pile sur la borne.
      if (q.duree == null || q.duree < DUREE_VIDEO_TOUR.min - 1 || q.duree > DUREE_VIDEO_TOUR.max + 1) {
        throw new BadRequestException(`La vidéo du tour doit durer entre ${DUREE_VIDEO_TOUR.min} et ${DUREE_VIDEO_TOUR.max} secondes`);
      }
    }
    const parConducteur = categorie === 'plaque' || categorie === 'vehicule' || CATEGORIES_DOCUMENT.includes(categorie);
    if (parConducteur && !q.conducteur) throw new BadRequestException(`La catégorie ${categorie} exige le conducteur (A ou B)`);
    // Une seule prise par étape guidée : reprendre une photo, ou la renvoyer
    // après une coupure réseau, remplace la précédente.
    const cond = parConducteur ? q.conducteur! : null;
    const anciens =
      categorie === 'libre' ? [] : await this.mediasRepo.find({ where: { dossierId, categorie, conducteur: cond ?? IsNull() } });
    const media = await this.mediasRepo.save(
      this.mediasRepo.create({
        dossierId,
        type: q.type,
        url,
        empreinte,
        categorie,
        conducteur: cond,
        dureeSecondes: q.duree ?? null,
      }),
    );
    await this.supprimerMedias(anciens);
    if (CATEGORIES_DOCUMENT.includes(categorie)) {
      const dossier = await this.getBrouillonOrFail(dossierId, user);
      dossier.documentsAbsents = dossier.documentsAbsents.filter((a) => !(a.categorie === categorie && a.conducteur === cond));
      await this.dossiersRepo.save(dossier);
    }
    return this.signerLiens({ medias: [media] }).medias![0];
  }

  private async supprimerMedias(medias: Media[]): Promise<void> {
    if (!medias.length) return;
    const urls = medias.map((m) => m.url);
    await this.mediasRepo.remove(medias);
    // Le fichier n'est effacé qu'après la ligne en base ; s'il manque déjà, peu importe.
    await Promise.all(urls.map((u) => unlink(join(process.cwd(), u)).catch(() => undefined)));
  }

  async addSignature(
    dossierId: string,
    dto: CreateSignatureDto,
    user: JwtPayload,
    saveImage: (bytes: Buffer) => Promise<string>,
  ): Promise<Signature> {
    await this.getBrouillonOrFail(dossierId, user);
    const bytes = Buffer.from(dto.imageBase64, 'base64');
    if (bytes.length === 0) throw new ForbiddenException('Signature vide');
    const hashSignature = createHash('sha256').update(bytes).digest('hex');
    const imageUrl = await saveImage(bytes);
    const anciennes = await this.signaturesRepo.find({ where: { dossierId, conducteurNom: dto.conducteurNom } });
    const signature = await this.signaturesRepo.save(
      this.signaturesRepo.create({ dossierId, conducteurNom: dto.conducteurNom, imageUrl, hashSignature }),
    );
    if (anciennes.length) await this.signaturesRepo.remove(anciennes);
    return this.signerLiens({ signatures: [signature] }).signatures![0];
  }

  /** Ce qu'il manque pour transmettre le dossier (mêmes règles que la capture guidée). */
  static elementsManquants(d: DossierConstat): string[] {
    const a = (categorie: string, conducteur: string | null = null) => d.medias.some((m) => m.categorie === categorie && m.conducteur === conducteur);
    const absent = (categorie: string, conducteur: string) => d.documentsAbsents.some((x) => x.categorie === categorie && x.conducteur === conducteur);
    const manquants: string[] = [];
    if (!a('vue_ensemble')) manquants.push('vue d’ensemble');
    for (const c of ['A', 'B']) {
      if (!a('plaque', c)) manquants.push(`plaque ${c}`);
      if (!a('vehicule', c)) manquants.push(`photo du véhicule ${c}`);
      for (const doc of CATEGORIES_DOCUMENT) {
        if (!a(doc, c) && !absent(doc, c)) manquants.push(`${doc.replace(/_/g, ' ')} ${c}`);
      }
    }
    if (!a('video_tour')) manquants.push('vidéo du tour');
    if (d.vehiculesImpliques.length < 2) manquants.push('informations des deux véhicules');
    if (d.signatures.length < 2) manquants.push('signatures des deux conducteurs');
    return manquants;
  }

  async definirDocumentsAbsents(dossierId: string, documents: DocumentAbsent[], user: JwtPayload): Promise<DocumentAbsent[]> {
    const dossier = await this.getBrouillonOrFail(dossierId, user);
    const uniques = new Map(documents.map((d) => [`${d.conducteur}:${d.categorie}`, { conducteur: d.conducteur, categorie: d.categorie }]));
    dossier.documentsAbsents = [...uniques.values()];
    const medias = await this.mediasRepo.find({ where: { dossierId } });
    await this.supprimerMedias(medias.filter((m) => dossier.documentsAbsents.some((a) => a.categorie === m.categorie && a.conducteur === m.conducteur)));
    await this.dossiersRepo.save(dossier);
    return dossier.documentsAbsents;
  }

  /**
   * Finalise le dossier : calcule l'empreinte d'intégrité du dossier complet
   * (véhicules, contenu des médias, signatures), la fait horodater par une
   * autorité d'horodatage si TSA_URL est configurée, et marque le dossier
   * comme transmis (cahier de conception §8 — valeur probante).
   */
  async soumettre(id: string, user: JwtPayload): Promise<DossierConstat> {
    await this.getBrouillonOrFail(id, user);
    const dossier = (await this.dossiersRepo.findOne({
      where: { id },
      relations: ['vehiculesImpliques', 'medias', 'signatures'],
    }))!;
    const manquants = DossiersService.elementsManquants(dossier);
    if (manquants.length) throw new BadRequestException(`Dossier incomplet : ${manquants.join(', ')}`);
    const contenu = JSON.stringify({
      vehicules: dossier.vehiculesImpliques,
      medias: dossier.medias.map((m) => ({ type: m.type, categorie: m.categorie, conducteur: m.conducteur, url: m.url, empreinte: m.empreinte })),
      documentsAbsents: dossier.documentsAbsents,
      signatures: dossier.signatures.map((s) => s.hashSignature),
    });
    dossier.hashIntegrite = createHash('sha256').update(contenu).digest('hex');
    const tsa = await this.horodatage.horodater(dossier.hashIntegrite);
    if (tsa) {
      dossier.horodatageJeton = tsa.jeton;
      dossier.horodatageDate = tsa.date;
      dossier.horodatageAutorite = tsa.autorite;
    }
    dossier.statut = 'transmis';
    dossier.dateTransmission = new Date();
    const transmis = await this.dossiersRepo.save(dossier);
    await this.evenementsRepo.save(this.evenementsRepo.create({ dossierId: id, type: 'transmission', auteurId: user.sub }));
    return this.signerLiens(transmis);
  }
}

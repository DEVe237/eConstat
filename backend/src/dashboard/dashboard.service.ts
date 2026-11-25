import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LiensSignesService } from '../common/liens-signes.service';
import { Temoignage } from '../dossiers/entities/temoignage.entity';
import { TransmissionAssureur } from '../dossiers/entities/transmission-assureur.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from '../auth/jwt.strategy';
import { DossierConstat, Responsabilite, StatutDossier } from '../dossiers/entities/dossier-constat.entity';
import { ValiderDto } from './dto/decision.dto';
import { DossierEvenement, TypeEvenement } from '../dossiers/entities/dossier-evenement.entity';
import { AnalyseIaService } from '../analyse-ia/analyse-ia.service';
import { UsersService } from '../users/users.service';
import { ListeDossiersQuery, STATUTS_AUTORITES } from './dto/liste-dossiers.query';

export interface DossierResume {
  id: string;
  numero: string;
  statut: StatutDossier;
  dateAccident: Date | null;
  dateTransmission: Date | null;
  lat: number | null;
  lng: number | null;
  conditionsMeteo: string | null;
  vehicules: { conducteurNom: string; plaque: string; marque: string | null }[];
}

/** Numéro court affiché à l'usager dans l'app (« #02EC6023 »). */
export const numeroDossier = (id: string) => `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

/**
 * Logique du dashboard autorités (cahier des charges §5.4 / EF-08) : les
 * autorités ne voient que les dossiers transmis (jamais les brouillons).
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(DossierConstat)
    private readonly dossiersRepo: Repository<DossierConstat>,
    @InjectRepository(DossierEvenement)
    private readonly evenementsRepo: Repository<DossierEvenement>,
    @InjectRepository(Temoignage)
    private readonly temoignagesRepo: Repository<Temoignage>,
    @InjectRepository(TransmissionAssureur)
    private readonly transmissionsRepo: Repository<TransmissionAssureur>,
    private readonly usersService: UsersService,
    private readonly liens: LiensSignesService,
      private readonly analyses: AnalyseIaService,
  ) {}

  /** Compagnie d'un compte assureur (null pour les autorités). */
  private async compagnieDe(user: JwtPayload): Promise<string | null> {
    if (user.role !== 'assureur') return null;
    const compte = await this.usersService.findById(user.sub);
    // Un assureur sans compagnie ne voit rien : valeur impossible plutôt que null.
    return compte?.compagnie ?? '\u0000';
  }

  async lister(query: ListeDossiersQuery, user: JwtPayload) {
    const page = query.page ?? 1;
    const limite = query.limite ?? 20;
    const qb = this.dossiersRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.vehiculesImpliques', 'v')
      .where('d.statut IN (:...statuts)', { statuts: query.statut ? [query.statut] : STATUTS_AUTORITES });

    const compagnie = await this.compagnieDe(user);
    if (compagnie !== null) {
      qb.andWhere('EXISTS (SELECT 1 FROM transmissions_assureurs ta WHERE ta.dossier_id = d.id AND ta.compagnie = :compagnie)', { compagnie });
    }
    if (query.du) qb.andWhere('COALESCE(d.dateAccident, d.dateCreation) >= :du', { du: query.du });
    if (query.au) qb.andWhere('COALESCE(d.dateAccident, d.dateCreation) <= :au', { au: query.au });
    if (query.q?.trim()) {
      const q = query.q.trim().replace(/^#/, '');
      qb.andWhere(
        `(EXISTS (SELECT 1 FROM vehicules_impliques vv WHERE vv.dossier_id = d.id
            AND (vv.plaque ILIKE :q OR vv."conducteurNom" ILIKE :q))
          OR REPLACE(CAST(d.id AS text), '-', '') ILIKE :qid)`,
        { q: `%${q}%`, qid: `${q.toLowerCase()}%` },
      );
    }
    if (query.lat !== undefined && query.lng !== undefined && query.rayonKm) {
      const dLat = query.rayonKm / 111;
      const dLng = query.rayonKm / (111 * Math.max(0.1, Math.cos((query.lat * Math.PI) / 180)));
      qb.andWhere('d.lat BETWEEN :latMin AND :latMax AND d.lng BETWEEN :lngMin AND :lngMax', {
        latMin: query.lat - dLat,
        latMax: query.lat + dLat,
        lngMin: query.lng - dLng,
        lngMax: query.lng + dLng,
      });
    }

    const [dossiers, total] = await qb
      .orderBy('d.dateTransmission', 'DESC', 'NULLS LAST')
      .addOrderBy('d.dateCreation', 'DESC')
      .skip((page - 1) * limite)
      .take(limite)
      .getManyAndCount();

    const items: DossierResume[] = dossiers.map((d) => ({
      id: d.id,
      numero: numeroDossier(d.id),
      statut: d.statut,
      dateAccident: d.dateAccident,
      dateTransmission: d.dateTransmission,
      lat: d.lat,
      lng: d.lng,
      conditionsMeteo: d.conditionsMeteo,
      vehicules: d.vehiculesImpliques.map((v) => ({ conducteurNom: v.conducteurNom, plaque: v.plaque, marque: v.marque })),
    }));
    return { items, total, page, limite };
  }

  /** Détail avec les chemins de fichiers internes (utilisé par l'export PDF). */
  async detailBrut(id: string, user: JwtPayload) {
    const dossier = await this.dossiersRepo.findOne({
      where: { id },
      relations: ['vehiculesImpliques', 'medias', 'signatures', 'simulations3d', 'evenements', 'temoignages', 'transmissionsAssureurs'],
    });
    if (!dossier || !STATUTS_AUTORITES.includes(dossier.statut)) {
      throw new NotFoundException(`Dossier ${id} introuvable`);
    }
    const compagnie = await this.compagnieDe(user);
    if (compagnie !== null && !dossier.transmissionsAssureurs.some((t) => t.compagnie === compagnie)) {
      throw new NotFoundException(`Dossier ${id} introuvable`);
    }
    if (compagnie !== null) {
      // Une compagnie ne voit que la transmission qui la concerne, remarque comprise.
      dossier.transmissionsAssureurs = dossier.transmissionsAssureurs.filter((t) => t.compagnie === compagnie);
      dossier.evenements = dossier.evenements.filter((e) => e.type !== 'envoi_assureur' || e.commentaire === `Transmis à ${compagnie}`);
    }
    dossier.temoignages.sort((a, b) => a.date.getTime() - b.date.getTime());
    dossier.transmissionsAssureurs.sort((a, b) => a.date.getTime() - b.date.getTime());
    dossier.evenements.sort((a, b) => a.date.getTime() - b.date.getTime());
    dossier.simulations3d.sort((a, b) => b.dateDemande.getTime() - a.dateDemande.getTime());
    dossier.medias.sort((a, b) => a.horodatage.getTime() - b.horodatage.getTime());
    dossier.vehiculesImpliques.sort((a, b) => a.dateAjout.getTime() - b.dateAjout.getTime());
    const agent = dossier.agentTraitantId ? await this.usersService.findById(dossier.agentTraitantId) : null;
    const analyse = await this.analyses.derniereSansControle(dossier.id);
    return {
      ...dossier,
      numero: numeroDossier(dossier.id),
      conclusion: dossier.responsabilite
        ? { responsabilite: dossier.responsabilite, partResponsabiliteA: dossier.partResponsabiliteA, libelle: DashboardService.libelleConclusion(dossier.responsabilite, dossier.partResponsabiliteA) }
        : null,
      analyseIA: analyse,
      agentTraitant: agent ? { id: agent.id, nom: `${agent.prenom} ${agent.nom}`, matricule: agent.matricule, unite: agent.unite } : null,
    };
  }

  /** Détail pour le client web : liens signés vers les fichiers et la scène 3D, jeton d'horodatage retiré. */
  async detail(id: string, user: JwtPayload) {
    const { horodatageJeton, ...d } = await this.detailBrut(id, user);
    d.medias.forEach((m) => (m.url = this.liens.fichier(m.url)!));
    d.signatures.forEach((s) => (s.imageUrl = this.liens.fichier(s.imageUrl)!));
    d.simulations3d.forEach((s) => (s.urlAnimation = this.liens.fichier(s.urlAnimation)));
    return {
      ...d,
      horodatage: horodatageJeton ? { date: d.horodatageDate, autorite: d.horodatageAutorite } : null,
      sceneUrl: this.liens.scene(d.id),
    };
  }

  /** Jeton RFC 3161 brut (.tsr), vérifiable avec `openssl ts -verify`. */
  async jetonHorodatage(id: string, user: JwtPayload): Promise<{ der: Buffer; numero: string }> {
    const d = await this.detailBrut(id, user);
    if (!d.horodatageJeton) throw new NotFoundException('Ce dossier n’a pas été horodaté');
    return { der: Buffer.from(d.horodatageJeton, 'base64'), numero: d.numero };
  }

  async prendreEnCharge(id: string, agent: JwtPayload) {
    await this.debuterTraitement(await this.getTransmisOrFail(id), agent);
    return this.detail(id, agent);
  }

  /** Première action d'une autorité sur un dossier reçu ; sans effet ensuite. */
  private async debuterTraitement(dossier: DossierConstat, agent: JwtPayload) {
    if (dossier.statut !== 'transmis') return;
    if (await this.evenementsRepo.existsBy({ dossierId: dossier.id, type: 'prise_en_charge' })) return;
    await this.journaliser(dossier.id, 'prise_en_charge', agent, null);
  }

  async ajouterTemoignage(id: string, agent: JwtPayload, data: { temoinNom: string; temoinTelephone?: string; recit: string }) {
    await this.debuterTraitement(await this.getTransmisOrFail(id), agent);
    const auteur = await this.nomAuteur(agent);
    await this.temoignagesRepo.save(
      this.temoignagesRepo.create({ dossierId: id, temoinNom: data.temoinNom.trim(), temoinTelephone: data.temoinTelephone?.trim() || null, recit: data.recit.trim(), recueilliPar: auteur }),
    );
    await this.journaliser(id, 'temoignage', agent, `Témoignage de ${data.temoinNom.trim()}`);
    return this.detail(id, agent);
  }

  compagnies() {
    return this.usersService.compagnies();
  }

  /** Rend le dossier consultable par les comptes de la compagnie d'assurance choisie. */
  async transmettreAssureur(id: string, agent: JwtPayload, compagnie: string, remarque?: string) {
    const dossier = await this.getTransmisOrFail(id);
    if (!(await this.usersService.compagnies()).includes(compagnie)) {
      throw new BadRequestException('Compagnie inconnue : créez d’abord un compte assureur pour elle');
    }
    if (await this.transmissionsRepo.findOne({ where: { dossierId: id, compagnie } })) {
      throw new BadRequestException(`Dossier déjà transmis à ${compagnie}`);
    }
    await this.debuterTraitement(dossier, agent);
    await this.transmissionsRepo.save(this.transmissionsRepo.create({ dossierId: id, compagnie, transmisPar: await this.nomAuteur(agent), remarque: remarque?.trim() || null }));
    await this.journaliser(id, 'envoi_assureur', agent, `Transmis à ${compagnie}`);
    return this.detail(id, agent);
  }

  private async nomAuteur(user: JwtPayload): Promise<string> {
    const compte = await this.usersService.findById(user.sub);
    return compte ? `${compte.prenom} ${compte.nom}` : user.email;
  }

  /** Validation avec conclusion : qui est responsable de l'accident, et pourquoi. */
  valider(id: string, agent: JwtPayload, dto: ValiderDto) {
    const part =
      dto.responsabilite === 'A' ? 100 : dto.responsabilite === 'B' ? 0 : dto.responsabilite === 'partagee' ? dto.partResponsabiliteA! : null;
    return this.decider(id, agent, 'validation', 'valide', dto.commentaire.trim(), { responsabilite: dto.responsabilite, part });
  }

  contester(id: string, agent: JwtPayload, motif: string) {
    return this.decider(id, agent, 'contestation', 'conteste', motif);
  }

  /** Complément d'information : ajoute une note à l'historique sans changer le statut. */
  async completer(id: string, agent: JwtPayload, commentaire: string) {
    await this.debuterTraitement(await this.getTransmisOrFail(id), agent);
    await this.journaliser(id, 'complement', agent, commentaire);
    return this.detail(id, agent);
  }

  private async decider(
    id: string,
    agent: JwtPayload,
    type: TypeEvenement,
    statut: StatutDossier,
    commentaire: string | null,
    conclusion?: { responsabilite: Responsabilite; part: number | null },
  ) {
    const dossier = await this.getTransmisOrFail(id);
    // Un dossier validé avant l'ajout des conclusions peut encore recevoir la sienne.
    const sansConclusion = statut === 'valide' && !dossier.responsabilite;
    if (dossier.statut === statut && !sansConclusion) {
      throw new BadRequestException(`Le dossier est déjà ${statut === 'valide' ? 'validé' : 'contesté'}`);
    }
    await this.debuterTraitement(dossier, agent);
    dossier.statut = statut;
    dossier.agentTraitantId = agent.sub;
    dossier.dateTraitement = new Date();
    dossier.commentaireAgent = commentaire;
    // Une contestation annule la conclusion précédente ; une validation la fixe.
    dossier.responsabilite = conclusion?.responsabilite ?? null;
    dossier.partResponsabiliteA = conclusion?.part ?? null;
    await this.dossiersRepo.save(dossier);
    const libelle = conclusion ? `Conclusion : ${DashboardService.libelleConclusion(conclusion.responsabilite, conclusion.part)}. ${commentaire}` : commentaire;
    await this.journaliser(id, type, agent, libelle);
    return this.detail(id, agent);
  }

  static libelleConclusion(r: Responsabilite | null, partA: number | null): string {
    switch (r) {
      case 'A':
        return 'conducteur A responsable (100 % / 0 %), le conducteur B a raison';
      case 'B':
        return 'conducteur B responsable (0 % / 100 %), le conducteur A a raison';
      case 'partagee':
        return `responsabilité partagée (A ${partA} % / B ${100 - (partA ?? 0)} %)`;
      case 'indeterminee':
        return 'responsabilité indéterminée';
      default:
        return '—';
    }
  }

  private async getTransmisOrFail(id: string): Promise<DossierConstat> {
    const dossier = await this.dossiersRepo.findOne({ where: { id } });
    if (!dossier || !STATUTS_AUTORITES.includes(dossier.statut)) {
      throw new NotFoundException(`Dossier ${id} introuvable`);
    }
    return dossier;
  }

  private async journaliser(dossierId: string, type: TypeEvenement, agent: JwtPayload, commentaire: string | null) {
    const user = await this.usersService.findById(agent.sub);
    await this.evenementsRepo.save(
      this.evenementsRepo.create({
        dossierId,
        type,
        auteurId: agent.sub,
        auteurNom: user ? `${user.prenom} ${user.nom}` : agent.email,
        commentaire,
      }),
    );
  }

  /** Tableaux de bord statistiques (cahier des charges §5.4). */
  async statistiques() {
    const st = `('transmis','valide','conteste')`;
    const q = <T>(sql: string) => this.dossiersRepo.query(sql) as Promise<T[]>;
    const [parStatut, parJour, delais, zones, meteo, chocs, heures, points] = await Promise.all([
      q<{ statut: string; n: string }>(`SELECT statut, COUNT(*) n FROM dossiers_constat WHERE statut IN ${st} GROUP BY statut`),
      q<{ jour: string; n: string }>(
        `SELECT to_char(date_trunc('day', "dateTransmission"), 'YYYY-MM-DD') jour, COUNT(*) n FROM dossiers_constat
         WHERE statut IN ${st} AND "dateTransmission" >= now() - interval '30 days' GROUP BY 1 ORDER BY 1`,
      ),
      q<{ traitement: string | null; transmission: string | null }>(
        `SELECT AVG(EXTRACT(EPOCH FROM ("dateTraitement" - "dateTransmission")) / 3600) traitement,
                AVG(EXTRACT(EPOCH FROM ("dateTransmission" - "dateAccident")) / 60) transmission
         FROM dossiers_constat WHERE statut IN ${st}`,
      ),
      q<{ lat: string; lng: string; n: string }>(
        `SELECT ROUND(lat::numeric, 2) lat, ROUND(lng::numeric, 2) lng, COUNT(*) n FROM dossiers_constat
         WHERE statut IN ${st} AND lat IS NOT NULL AND lng IS NOT NULL GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 10`,
      ),
      q<{ valeur: string | null; n: string }>(
        `SELECT "conditionsMeteo" valeur, COUNT(*) n FROM dossiers_constat WHERE statut IN ${st} GROUP BY 1 ORDER BY 2 DESC`,
      ),
      q<{ valeur: string | null; n: string }>(
        `SELECT v."zoneChoc" valeur, COUNT(*) n FROM vehicules_impliques v JOIN dossiers_constat d ON d.id = v.dossier_id
         WHERE d.statut IN ${st} GROUP BY 1 ORDER BY 2 DESC`,
      ),
      q<{ heure: number; n: string }>(
        `SELECT EXTRACT(HOUR FROM "dateAccident")::int heure, COUNT(*) n FROM dossiers_constat
         WHERE statut IN ${st} AND "dateAccident" IS NOT NULL GROUP BY 1 ORDER BY 1`,
      ),
      q<{ id: string; lat: number; lng: number; statut: string }>(
        `SELECT id, lat, lng, statut FROM dossiers_constat WHERE statut IN ${st} AND lat IS NOT NULL AND lng IS NOT NULL
         ORDER BY "dateTransmission" DESC NULLS LAST LIMIT 2000`,
      ),
    ]);
    const n = (x: string | number) => Number(x);
    const totaux = { transmis: 0, valide: 0, conteste: 0 } as Record<string, number>;
    for (const r of parStatut) totaux[r.statut] = n(r.n);
    return {
      totaux: { ...totaux, total: totaux.transmis + totaux.valide + totaux.conteste },
      parJour: parJour.map((r) => ({ jour: r.jour, n: n(r.n) })),
      delaiTraitementHeures: delais[0]?.traitement != null ? Number(delais[0].traitement) : null,
      delaiTransmissionMinutes: delais[0]?.transmission != null ? Number(delais[0].transmission) : null,
      zonesARisque: zones.map((r) => ({ lat: Number(r.lat), lng: Number(r.lng), n: n(r.n) })),
      meteo: meteo.map((r) => ({ valeur: r.valeur ?? 'Non renseignée', n: n(r.n) })),
      zonesChoc: chocs.map((r) => ({ valeur: r.valeur ?? 'Non renseignée', n: n(r.n) })),
      parHeure: heures.map((r) => ({ heure: Number(r.heure), n: n(r.n) })),
      points: points.map((p) => ({ ...p, numero: numeroDossier(p.id) })),
    };
  }
}

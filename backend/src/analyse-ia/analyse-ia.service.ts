import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync, statSync } from 'fs';
import { extname, join, normalize, sep } from 'path';
import { In, Repository } from 'typeorm';
import type { JwtPayload } from '../auth/jwt.strategy';
import { DossiersService } from '../dossiers/dossiers.service';
import { DossierConstat } from '../dossiers/entities/dossier-constat.entity';
import { Media } from '../dossiers/entities/media.entity';
import { AnalyseIA, ResultatAnalyseIA } from './analyse-ia.entity';

const UPLOADS_ROOT = join(process.cwd(), 'uploads');
/** Photos utiles à l'analyse de l'accident (pas les pièces d'identité). */
const CATEGORIES_ANALYSEES = ['plaque', 'vue_ensemble', 'vehicule', 'libre'];
const MAX_PHOTOS = 10;
/** L'API refuse les images de plus de 5 Mo une fois encodées en base64. */
const TAILLE_MAX_OCTETS = 3.7 * 1024 * 1024;
type TypeImage = 'image/jpeg' | 'image/png' | 'image/webp';
const TYPES_IMAGE: Record<string, TypeImage> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const texte = { type: 'string' };
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['vehicules', 'typeRoute', 'conditionsMeteo', 'typeCollision', 'angleImpactDeg', 'resume', 'confiance'],
  properties: {
    vehicules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['conducteur', 'plaque', 'marque', 'couleur', 'zoneChoc', 'degats', 'gravite'],
        properties: {
          conducteur: { type: 'string', enum: ['A', 'B'] },
          plaque: texte,
          marque: texte,
          couleur: texte,
          zoneChoc: { type: 'string', enum: ['avant', 'arriere', 'flanc_gauche', 'flanc_droit', 'inconnue'] },
          degats: texte,
          gravite: { type: 'string', enum: ['legere', 'moyenne', 'importante', 'inconnue'] },
        },
      },
    },
    typeRoute: { type: 'string', enum: ['route_urbaine', 'carrefour', 'rond_point', 'route_nationale', 'piste', 'parking', 'inconnu'] },
    conditionsMeteo: { type: 'string', enum: ['meteo_beau', 'meteo_pluie', 'meteo_humide', 'meteo_brouillard', 'meteo_nuit', 'inconnu'] },
    typeCollision: { type: 'string', enum: ['frontale', 'arriere', 'laterale', 'en_angle', 'autre', 'inconnu'] },
    angleImpactDeg: { type: 'number' },
    resume: texte,
    confiance: { type: 'number' },
  },
};

const CONSIGNES = `Tu assistes la police routière camerounaise dans l'établissement de constats d'accident.
Tu reçois les photos prises sur les lieux par les conducteurs. Chaque photo est précédée d'une étiquette
indiquant ce qu'elle est censée montrer (plaque du véhicule A, vue d'ensemble, véhicule B…).

Décris uniquement ce qui est visible sur les photos :
- pour chaque véhicule (A et B) : la plaque d'immatriculation lue telle quelle (chaîne vide si illisible), la marque,
  la couleur, la zone de choc principale, une description courte des dégâts visibles et leur gravité ;
- le type de route et la météo apparents ;
- le type de collision et l'angle entre les directions de déplacement des deux véhicules au moment du choc
  (0 = même sens, choc arrière ; 90 = perpendiculaire ; 180 = face à face ; -1 si impossible à estimer) ;
- un résumé factuel en français de 2 à 3 phrases, sans désigner de responsable : la responsabilité est
  établie par l'agent, pas par toi.
Utilise "inconnu", "inconnue" ou une chaîne vide quand une information n'est pas visible, plutôt que de deviner.
"confiance" est un nombre entre 0 et 1 qui reflète la qualité et la cohérence des photos.`;

@Injectable()
export class AnalyseIaService {
  private readonly logger = new Logger(AnalyseIaService.name);
  private readonly client: Anthropic | null;
  private readonly modele: string;

  constructor(
    config: ConfigService,
    @InjectRepository(AnalyseIA) private readonly analysesRepo: Repository<AnalyseIA>,
    @InjectRepository(DossierConstat) private readonly dossiersRepo: Repository<DossierConstat>,
    @InjectRepository(Media) private readonly mediasRepo: Repository<Media>,
  ) {
    const cle = config.get<string>('ANTHROPIC_API_KEY');
    this.modele = config.get<string>('IA_MODELE')?.trim() ?? '';
    // Sans clé ni modèle, l'analyse est simplement indisponible : le reste de l'application fonctionne.
    this.client = cle && this.modele ? new Anthropic({ apiKey: cle, timeout: 120_000, maxRetries: 1 }) : null;
  }

  get disponible(): boolean {
    return this.client !== null;
  }

  private async dossierLisible(dossierId: string, user: JwtPayload): Promise<DossierConstat> {
    const dossier = await this.dossiersRepo.findOne({ where: { id: dossierId } });
    if (!dossier || !DossiersService.peutLire(dossier, user)) throw new NotFoundException(`Dossier ${dossierId} introuvable`);
    return dossier;
  }

  async derniere(dossierId: string, user: JwtPayload): Promise<AnalyseIA | null> {
    await this.dossierLisible(dossierId, user);
    return this.derniereSansControle(dossierId);
  }

  /** Pour les services internes (dashboard, reconstitution 3D) dont l'accès est déjà contrôlé. */
  derniereSansControle(dossierId: string): Promise<AnalyseIA | null> {
    return this.analysesRepo.findOne({ where: { dossierId }, order: { dateCreation: 'DESC' } });
  }

  async analyser(dossierId: string, user: JwtPayload): Promise<AnalyseIA> {
    await this.dossierLisible(dossierId, user);
    const enregistrer = (a: Partial<AnalyseIA>) => this.analysesRepo.save(this.analysesRepo.create({ dossierId, ...a }));

    if (!this.client) {
      return enregistrer({ statut: 'indisponible', erreur: 'Analyse IA non configurée (ANTHROPIC_API_KEY ou IA_MODELE absent)' });
    }

    const medias = await this.mediasRepo.find({
      where: { dossierId, type: 'photo', categorie: In(CATEGORIES_ANALYSEES) },
      order: { horodatage: 'ASC' },
    });
    const contenu: Anthropic.Beta.BetaContentBlockParam[] = [];
    let photos = 0;
    for (const m of medias) {
      if (photos >= MAX_PHOTOS) break;
      const image = this.lireImage(m.url);
      if (!image) continue;
      contenu.push({ type: 'text', text: `Photo ${photos + 1} : ${this.etiquette(m)}` });
      contenu.push({ type: 'image', source: { type: 'base64', media_type: image.type, data: image.donnees } });
      photos++;
    }
    if (photos === 0) {
      return enregistrer({ statut: 'echouee', erreur: 'Aucune photo exploitable (JPEG, PNG ou WebP de moins de 3,7 Mo)' });
    }
    contenu.push({ type: 'text', text: 'Analyse ces photos et réponds selon le schéma demandé.' });

    try {
      const reponse = await this.client.beta.messages.create({
        model: this.modele,
        max_tokens: 16000,
        // En cas de refus par les filtres de sécurité, l'API rejoue la requête sur un modèle de repli.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
        system: CONSIGNES,
        messages: [{ role: 'user', content: contenu }],
      });
      if (reponse.stop_reason === 'refusal') {
        return enregistrer({ statut: 'echouee', modele: reponse.model, photosAnalysees: photos, erreur: 'Le modèle a refusé d’analyser ces photos' });
      }
      const bloc = reponse.content.find((b) => b.type === 'text');
      if (!bloc || bloc.type !== 'text') throw new Error('Réponse de l’IA sans contenu');
      const resultat = this.normaliser(JSON.parse(bloc.text) as ResultatAnalyseIA);
      return enregistrer({ statut: 'terminee', modele: reponse.model, photosAnalysees: photos, resultat });
    } catch (err) {
      let message: string;
      if (err instanceof Anthropic.AuthenticationError) message = 'Clé ANTHROPIC_API_KEY invalide';
      else if (err instanceof Anthropic.RateLimitError) message = 'Quota de l’API IA atteint, réessayez plus tard';
      else if (err instanceof Anthropic.APIError) message = `Erreur de l’API IA (${err.status ?? 'réseau'})`;
      else message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Analyse IA du dossier ${dossierId} échouée : ${message}`);
      return enregistrer({ statut: 'echouee', modele: this.modele, photosAnalysees: photos, erreur: message });
    }
  }

  private etiquette(m: Media): string {
    const quoi: Record<string, string> = {
      plaque: 'plaque d’immatriculation',
      vue_ensemble: 'vue d’ensemble de la scène',
      vehicule: 'vue des dégâts',
      libre: 'photo libre',
    };
    return `${quoi[m.categorie] ?? m.categorie}${m.conducteur ? ` du véhicule ${m.conducteur}` : ''}`;
  }

  /** Lit une photo stockée localement ; ignore celles que l'API refuserait. */
  private lireImage(url: string): { type: TypeImage; donnees: string } | null {
    if (!url.startsWith('/uploads/')) return null;
    const chemin = normalize(join(UPLOADS_ROOT, url.slice('/uploads/'.length)));
    const type = TYPES_IMAGE[extname(chemin).toLowerCase()];
    if (!type || !chemin.startsWith(UPLOADS_ROOT + sep) || !existsSync(chemin)) return null;
    if (statSync(chemin).size > TAILLE_MAX_OCTETS) return null;
    return { type, donnees: readFileSync(chemin).toString('base64') };
  }

  /** Bornes que le schéma JSON ne peut pas imposer. */
  private normaliser(r: ResultatAnalyseIA): ResultatAnalyseIA {
    const angle = Number(r.angleImpactDeg);
    return {
      ...r,
      angleImpactDeg: Number.isFinite(angle) && angle >= 0 ? Math.min(180, Math.round(angle)) : -1,
      confiance: Math.min(1, Math.max(0, Number(r.confiance) || 0)),
      vehicules: (r.vehicules ?? []).slice(0, 2),
    };
  }
}

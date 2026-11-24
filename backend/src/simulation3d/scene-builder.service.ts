import { Injectable } from '@nestjs/common';
import type { ResultatAnalyseIA, VehiculeAnalyse } from '../analyse-ia/analyse-ia.entity';
import { DossierConstat } from '../dossiers/entities/dossier-constat.entity';
import { VehiculeImplique } from '../dossiers/entities/vehicule-implique.entity';

export interface SceneVehicule {
  id: string;
  nom: string;
  plaque: string;
  type: 'voiture' | 'moto' | 'camion' | 'bus';
  /** Lettre affichée au-dessus du véhicule (A, B…). */
  lettre: string;
  /** Couleur relevée sur les photos (#rrggbb), ou null : couleur conventionnelle. */
  couleur: string | null;
  zoneChoc: string | null;
  /** Gravité des dégâts relevée sur les photos, ou null. */
  gravite: 'legere' | 'moyenne' | 'importante' | null;
  vitesseKmh: number;
  /** Position de départ, dans le repère local de la scène (mètres). */
  depart: [number, number, number];
  /** Point d'impact déclaré (proche de l'origine de la scène). */
  impact: [number, number, number];
  /** Position finale après déflexion post-choc. */
  arrivee: [number, number, number];
  /** Cap final, en radians (par défaut : direction impact → arrivée). */
  capArrivee?: number;
  /** Cap initial du véhicule, en radians (0 = vers +Z). */
  capDepart: number;
  /** Fraction (0..1) de la durée totale à laquelle ce véhicule atteint le point de choc. */
  tImpact: number;
}

export interface Scene3D {
  dossierId: string;
  pointDeChoc: string | null;
  lieu: { lat: number | null; lng: number | null };
  dureeSecondes: number;
  vehicules: SceneVehicule[];
  /** Forme de la route (analyse des photos) ; « carrefour » par défaut. */
  route: 'route_urbaine' | 'carrefour' | 'rond_point' | 'route_nationale' | 'piste' | 'parking';
  routeSource: 'ia' | 'defaut';
  /** Météo déclarée (ou à défaut relevée sur les photos). */
  meteo: 'meteo_beau' | 'meteo_pluie' | 'meteo_humide' | 'meteo_brouillard' | 'meteo_nuit';
  /** « ia » quand l'angle d'impact vient de l'analyse des photos, sinon « declaratif ». */
  sourceTrajectoire: 'ia' | 'declaratif';
  /** Rappel de l'analyse IA affiché dans la visionneuse. */
  analyseIA: { typeCollision: string; angleImpactDeg: number; resume: string } | null;
}

const DISTANCE_UNITS_PER_KMH = 0.35;
const DISTANCE_MIN = 8;
const DISTANCE_MAX = 55;
const T_IMPACT = 0.6; // 60% du temps total = phase pré-impact (cf. maquette : Pré-impact/Collision/Post-impact)
const DEFLEXION_DISTANCE = 6;

const METEOS = ['meteo_beau', 'meteo_pluie', 'meteo_humide', 'meteo_brouillard', 'meteo_nuit'] as const;

/** Noms de couleur en français → teinte ; le premier motif reconnu l'emporte. */
const TEINTES: [RegExp, string][] = [
  [/blanc|creme|ivoire/, '#e9eaec'],
  [/noir/, '#1d1f23'],
  [/argent/, '#b4b8be'],
  [/gris|anthracite/, '#7d8288'],
  [/bordeaux/, '#6d1426'],
  [/rouge/, '#b81d24'],
  [/orange/, '#e0701c'],
  [/jaune/, '#f2c21a'],
  [/vert/, '#2c7a45'],
  [/turquoise|cyan/, '#23a5ad'],
  [/bleu/, '#2456a6'],
  [/violet|mauve/, '#65358f'],
  [/rose/, '#d4708f'],
  [/marron|brun/, '#63412b'],
  [/beige|sable|champagne/, '#cdb993'],
  [/dore|or\b/, '#b8923a'],
];
function couleurHex(nom?: string): string | null {
  if (!nom) return null;
  const n = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return TEINTES.find(([motif]) => motif.test(n))?.[1] ?? null;
}

/** Demi-longueur et demi-largeur (m) des silhouettes de `scene-builder.js`. */
const GABARITS: Record<SceneVehicule['type'], [number, number]> = { voiture: [2.1, 0.9], moto: [1, 0.4], camion: [3.5, 1.2], bus: [4.5, 1.25] };

/** Position du centre de chaque véhicule au moment du choc, carrosseries en contact autour de l'origine. */
function pointsDeContact(angleDeg: number, caps: number[], zones: (string | null)[], types: SceneVehicule['type'][]): [number, number, number][] {
  const vers = (i: number, d: number): [number, number, number] => [Math.sin(caps[i]) * d, 0, Math.cos(caps[i]) * d];
  const long = (i: number) => GABARITS[types[i]][0];
  if (angleDeg < 45) {
    // Choc arrière : le véhicule touché à l'arrière est devant.
    const devant = zones[1] === 'arriere' && zones[0] !== 'arriere' ? 1 : 0;
    return [0, 1].map((i) => vers(i, i === devant ? long(i) : -long(i)));
  }
  if (angleDeg > 135) return [0, 1].map((i) => vers(i, -long(i)));
  // Choc latéral : celui qui est touché au flanc est au centre, l'autre le percute de l'avant.
  const percutant = zones[0] === 'avant' && zones[1] !== 'avant' ? 0 : 1;
  const largeurTouchee = GABARITS[types[1 - percutant]][1];
  return [0, 1].map((i) => (i === percutant ? vers(i, -(long(i) + largeurTouchee)) : [0, 0, 0]));
}

/** Position et cap d'arrêt après le choc : illustration, sans valeur de calcul physique. */
function apresChoc(angleDeg: number, caps: number[], zones: (string | null)[], impacts: [number, number, number][]): { arrivee: [number, number, number]; cap: number }[] {
  const h = caps.map((c) => [Math.sin(c), Math.cos(c)]);
  const depuis = (i: number, dx: number, dz: number): [number, number, number] => [impacts[i][0] + dx, 0, impacts[i][2] + dz];
  if (angleDeg < 45) {
    // Choc arrière : le véhicule de devant est projeté, l'autre s'arrête presque.
    const devant = zones[1] === 'arriere' && zones[0] !== 'arriere' ? 1 : 0;
    return [0, 1].map((i) => {
      const d = i === devant ? 5 : 1.2;
      return { arrivee: depuis(i, h[i][0] * d, h[i][1] * d), cap: caps[i] + (i === devant ? 0.15 : -0.05) };
    });
  }
  if (angleDeg > 135) {
    // Face à face : léger recul, chacun pivote de son côté.
    return [0, 1].map((i) => ({ arrivee: depuis(i, -h[i][0] * 1.4 + h[i][1] * 0.4, -h[i][1] * 1.4 - h[i][0] * 0.4), cap: caps[i] - 0.3 }));
  }
  // Choc latéral : le véhicule touché est poussé par l'autre tout en gardant un peu de son élan.
  const percutant = zones[0] === 'avant' && zones[1] !== 'avant' ? 0 : 1;
  return [0, 1].map((i) => {
    if (i === percutant) return { arrivee: depuis(i, h[i][0] * 0.6, h[i][1] * 0.6), cap: caps[i] };
    const p = h[percutant];
    const sens = Math.sign(Math.sin(caps[percutant] - caps[i])) || 1;
    return { arrivee: depuis(i, p[0] * 4 + h[i][0] * 2, p[1] * 4 + h[i][1] * 2), cap: caps[i] + sens * 0.35 };
  });
}

/**
 * Construit une description JSON de scène à partir des données structurées du
 * dossier (cahier de conception §6.2/§6.3 — "moteur de trajectoire").
 *
 * Heuristique assumée (aucune reconstruction physique certifiée, cf. §6.3
 * "Limite assumée" du document) : chaque véhicule se voit assigner un axe
 * d'approche (Z pour avant/arrière, X pour flanc_gauche/flanc_droit, sinon
 * alternance par index) et une direction alternée le long de cet axe, de
 * sorte que les véhicules impliqués convergent visuellement vers le point de
 * choc déclaré. La distance de départ est dérivée de la vitesse déclarée : à
 * durée de phase pré-impact égale, un véhicule plus rapide démarre plus loin.
 */
@Injectable()
export class SceneBuilderService {
  build(
    dossier: DossierConstat,
    vehicules: VehiculeImplique[],
    dureeSecondes: number,
    ia?: ResultatAnalyseIA | null,
  ): Scene3D {
    const base = {
      dossierId: dossier.id,
      pointDeChoc: dossier.pointDeChoc,
      lieu: { lat: dossier.lat, lng: dossier.lng },
      dureeSecondes,
      analyseIA: ia ? { typeCollision: ia.typeCollision, angleImpactDeg: ia.angleImpactDeg, resume: ia.resume } : null,
    };
    const angleConnu = !!ia && ia.angleImpactDeg >= 0 && vehicules.length === 2;
    const decor = { ...this.route(ia, angleConnu), meteo: this.meteo(dossier, ia) };
    const enrichir = (liste: SceneVehicule[]) => liste.map((v) => this.selonPhotos(v, vehicules, ia));
    // Deux véhicules et un angle d'impact estimé sur les photos : trajectoires
    // orientées selon cet angle plutôt que selon l'heuristique déclarative.
    if (ia && angleConnu) {
      return { ...base, ...decor, sourceTrajectoire: 'ia', vehicules: enrichir(this.trajectoiresIA(vehicules, ia, dureeSecondes)) };
    }

    // Regroupe les véhicules par axe d'approche pour alterner leur sens de
    // circulation sur cet axe (sinon deux véhicules sur le même axe et le
    // même sens ne se "rencontrent" jamais visuellement).
    const parAxe = new Map<'x' | 'z', VehiculeImplique[]>();
    for (const [index, v] of vehicules.entries()) {
      const axe = this.axeApproche(v.zoneChoc, index);
      const groupe = parAxe.get(axe) ?? [];
      groupe.push(v);
      parAxe.set(axe, groupe);
    }

    const sceneVehicules: SceneVehicule[] = [];
    for (const [axe, groupe] of parAxe) {
      groupe.forEach((v, rangDansAxe) => {
        const sens = rangDansAxe % 2 === 0 ? 1 : -1;
        const voieLaterale = Math.floor(rangDansAxe / 2) * 3;
        const vitesseKmh = this.parseVitesse(v.vitesseEstimee);
        const distance = this.clamp(
          vitesseKmh * DISTANCE_UNITS_PER_KMH * T_IMPACT * (dureeSecondes / 20),
          DISTANCE_MIN,
          DISTANCE_MAX,
        );

        const directionApproche: [number, number, number] =
          axe === 'z' ? [0, 0, sens] : [sens, 0, 0];
        const decalageLateral: [number, number, number] =
          axe === 'z' ? [voieLaterale, 0, 0] : [0, 0, voieLaterale];

        const depart: [number, number, number] = [
          -directionApproche[0] * distance + decalageLateral[0],
          0,
          -directionApproche[2] * distance + decalageLateral[2],
        ];
        const impact: [number, number, number] = [
          decalageLateral[0],
          0,
          decalageLateral[2],
        ];

        // Déflexion post-choc : le véhicule d'indice pair dévie à +90°, celui
        // d'indice impair à -90°, sur une courte distance.
        const anglesDeflexion = rangDansAxe % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
        const capApproche = Math.atan2(directionApproche[0], directionApproche[2]);
        const capDeflexion = capApproche + anglesDeflexion;
        const arrivee: [number, number, number] = [
          impact[0] + Math.sin(capDeflexion) * DEFLEXION_DISTANCE,
          0,
          impact[2] + Math.cos(capDeflexion) * DEFLEXION_DISTANCE,
        ];

        sceneVehicules.push({
          id: v.id,
          nom: v.conducteurNom,
          plaque: v.plaque,
          type: this.typeVehicule(v.marque),
          lettre: '',
          couleur: null,
          gravite: null,
          zoneChoc: v.zoneChoc,
          vitesseKmh,
          depart,
          impact,
          arrivee,
          capDepart: capApproche,
          tImpact: T_IMPACT,
        });
      });
    }

    const enrichis = enrichir(sceneVehicules);
    if (enrichis.length === 2) this.ecarterAuContact(enrichis);
    return { ...base, ...decor, sourceTrajectoire: 'declaratif', vehicules: enrichis };
  }

  /**
   * Le véhicule A arrive selon +Z (cap 0) ; le véhicule B selon le cap égal à
   * l'angle estimé (0 = même sens, 180 = face à face). Les zones de choc vues
   * sur les photos (complétées par la déclaration) décident qui percute qui.
   */
  private trajectoiresIA(vehicules: VehiculeImplique[], ia: ResultatAnalyseIA, dureeSecondes: number): SceneVehicule[] {
    const zone = (i: number) => {
      const vueIA = ia.vehicules.find((v) => v.conducteur === (i === 0 ? 'A' : 'B'))?.zoneChoc;
      return vueIA && vueIA !== 'inconnue' ? vueIA : vehicules[i].zoneChoc;
    };
    const angle = (ia.angleImpactDeg * Math.PI) / 180;
    const caps = [0, angle];
    const cap = (c: number): [number, number, number] => [Math.sin(c), 0, Math.cos(c)];
    const types = vehicules.map((v, i) => this.typeSelonPhotos(v, i, ia));
    const impacts = pointsDeContact(ia.angleImpactDeg, caps, [zone(0), zone(1)], types);
    const suites = apresChoc(ia.angleImpactDeg, caps, [zone(0), zone(1)], impacts);

    return vehicules.map((v, i) => {
      const vitesseKmh = this.parseVitesse(v.vitesseEstimee);
      const distance = this.clamp(vitesseKmh * DISTANCE_UNITS_PER_KMH * T_IMPACT * (dureeSecondes / 20), DISTANCE_MIN, DISTANCE_MAX);
      const h = cap(caps[i]);
      const impact = impacts[i];
      const depart: [number, number, number] = [impact[0] - h[0] * distance, 0, impact[2] - h[2] * distance];
      return {
        id: v.id,
        nom: v.conducteurNom,
        plaque: v.plaque,
        type: types[i],
        lettre: '',
        couleur: null,
        gravite: null,
        zoneChoc: zone(i),
        vitesseKmh,
        depart,
        impact,
        arrivee: suites[i].arrivee,
        capArrivee: suites[i].cap,
        capDepart: caps[i],
        tImpact: T_IMPACT,
      };
    });
  }

  /** Complète un véhicule avec ce que les photos montrent : couleur, type, zone et gravité des dégâts. */
  private selonPhotos(v: SceneVehicule, vehicules: VehiculeImplique[], ia?: ResultatAnalyseIA | null): SceneVehicule {
    const lettre = String.fromCharCode(65 + vehicules.findIndex((x) => x.id === v.id));
    const vu: VehiculeAnalyse | undefined = ia?.vehicules.find((x) => x.conducteur === lettre);
    return {
      ...v,
      lettre,
      couleur: couleurHex(vu?.couleur),
      type: this.typeSelonPhotos(vehicules[lettre.charCodeAt(0) - 65], lettre.charCodeAt(0) - 65, ia),
      zoneChoc: vu && vu.zoneChoc !== 'inconnue' ? vu.zoneChoc : v.zoneChoc,
      gravite: vu && vu.gravite !== 'inconnue' ? vu.gravite : null,
    };
  }

  private typeSelonPhotos(v: VehiculeImplique, rang: number, ia?: ResultatAnalyseIA | null): SceneVehicule['type'] {
    const vu = ia?.vehicules.find((x) => x.conducteur === String.fromCharCode(65 + rang))?.typeVehicule;
    return vu && vu !== 'inconnu' ? vu : this.typeVehicule(v.marque);
  }

  /** Décale les deux véhicules pour que les carrosseries se touchent sans se traverser. */
  private ecarterAuContact(liste: SceneVehicule[]): void {
    const ecart = Math.abs(Math.atan2(Math.sin(liste[1].capDepart - liste[0].capDepart), Math.cos(liste[1].capDepart - liste[0].capDepart)));
    const impacts = pointsDeContact((ecart * 180) / Math.PI, liste.map((v) => v.capDepart), liste.map((v) => v.zoneChoc), liste.map((v) => v.type));
    const suites = apresChoc((ecart * 180) / Math.PI, liste.map((v) => v.capDepart), liste.map((v) => v.zoneChoc), impacts);
    liste.forEach((v, i) => {
      const d = [impacts[i][0] - v.impact[0], impacts[i][2] - v.impact[2]];
      const deplacer = (p: [number, number, number]): [number, number, number] => [p[0] + d[0], p[1], p[2] + d[1]];
      v.depart = deplacer(v.depart);
      v.impact = deplacer(v.impact);
      v.arrivee = suites[i].arrivee;
      v.capArrivee = suites[i].cap;
    });
  }

  private route(ia: ResultatAnalyseIA | null | undefined, angleConnu: boolean): Pick<Scene3D, 'route' | 'routeSource'> {
    if (!ia || ia.typeRoute === 'inconnu') return { route: 'carrefour', routeSource: 'defaut' };
    // Le rond-point suppose des trajectoires orientées par l'angle : sinon un véhicule traverserait l'îlot.
    if (ia.typeRoute === 'rond_point' && !angleConnu) return { route: 'carrefour', routeSource: 'defaut' };
    return { route: ia.typeRoute, routeSource: 'ia' };
  }

  /** La météo vérifiée par le conducteur prime sur celle des photos. */
  private meteo(dossier: DossierConstat, ia?: ResultatAnalyseIA | null): Scene3D['meteo'] {
    for (const m of [dossier.conditionsMeteo, ia?.conditionsMeteo]) {
      if (m && (METEOS as readonly string[]).includes(m)) return m as Scene3D['meteo'];
    }
    return 'meteo_beau';
  }

  private axeApproche(zoneChoc: string | null, index: number): 'x' | 'z' {
    if (zoneChoc === 'avant' || zoneChoc === 'arriere') return 'z';
    if (zoneChoc === 'flanc_gauche' || zoneChoc === 'flanc_droit') return 'x';
    return index % 2 === 0 ? 'z' : 'x';
  }

  private parseVitesse(vitesseEstimee: string | null): number {
    if (!vitesseEstimee) return 50;
    const match = /\d+([.,]\d+)?/.exec(vitesseEstimee);
    if (!match) return 50;
    return parseFloat(match[0].replace(',', '.'));
  }

  private typeVehicule(marque: string | null): SceneVehicule['type'] {
    const m = (marque ?? '').toLowerCase();
    if (/moto|scooter|yamaha|honda\s*cb|harley/.test(m)) return 'moto';
    if (/camion|truck|iveco|man\b|scania/.test(m)) return 'camion';
    if (/bus|autocar|coaster/.test(m)) return 'bus';
    return 'voiture';
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}

import { Injectable } from '@nestjs/common';
import type { ResultatAnalyseIA } from '../analyse-ia/analyse-ia.entity';
import { DossierConstat } from '../dossiers/entities/dossier-constat.entity';
import { VehiculeImplique } from '../dossiers/entities/vehicule-implique.entity';

export interface SceneVehicule {
  id: string;
  nom: string;
  plaque: string;
  type: 'voiture' | 'moto' | 'camion' | 'bus';
  zoneChoc: string | null;
  vitesseKmh: number;
  /** Position de départ, dans le repère local de la scène (mètres). */
  depart: [number, number, number];
  /** Point d'impact déclaré (proche de l'origine de la scène). */
  impact: [number, number, number];
  /** Position finale après déflexion post-choc. */
  arrivee: [number, number, number];
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
    // Deux véhicules et un angle d'impact estimé sur les photos : trajectoires
    // orientées selon cet angle plutôt que selon l'heuristique déclarative.
    if (ia && ia.angleImpactDeg >= 0 && vehicules.length === 2) {
      return { ...base, sourceTrajectoire: 'ia', vehicules: this.trajectoiresIA(vehicules, ia, dureeSecondes) };
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

    return { ...base, sourceTrajectoire: 'declaratif', vehicules: sceneVehicules };
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
    const DEMI_LONGUEUR = 2.2;

    // Point de contact de chaque véhicule, de façon à ce que les carrosseries se touchent sans se superposer.
    let impacts: [number, number, number][];
    if (ia.angleImpactDeg < 45) {
      // Choc arrière : le véhicule touché à l'arrière est devant.
      const devant = zone(1) === 'arriere' && zone(0) !== 'arriere' ? 1 : 0;
      const h = cap(0);
      impacts = [0, 1].map((i) => {
        const s = i === devant ? 1 : -1;
        return [h[0] * DEMI_LONGUEUR * s, 0, h[2] * DEMI_LONGUEUR * s] as [number, number, number];
      });
    } else if (ia.angleImpactDeg > 135) {
      impacts = [0, 1].map((i) => {
        const h = cap(caps[i]);
        return [-h[0] * DEMI_LONGUEUR, 0, -h[2] * DEMI_LONGUEUR] as [number, number, number];
      });
    } else {
      // Choc latéral : celui qui est touché au flanc reste au centre, l'autre le percute de l'avant.
      const percutant = zone(0) === 'avant' && zone(1) !== 'avant' ? 0 : 1;
      impacts = [0, 1].map((i) => {
        if (i !== percutant) return [0, 0, 0] as [number, number, number];
        const h = cap(caps[i]);
        return [-h[0] * DEMI_LONGUEUR * 1.2, 0, -h[2] * DEMI_LONGUEUR * 1.2] as [number, number, number];
      });
    }

    return vehicules.map((v, i) => {
      const vitesseKmh = this.parseVitesse(v.vitesseEstimee);
      const distance = this.clamp(vitesseKmh * DISTANCE_UNITS_PER_KMH * T_IMPACT * (dureeSecondes / 20), DISTANCE_MIN, DISTANCE_MAX);
      const h = cap(caps[i]);
      const impact = impacts[i];
      const depart: [number, number, number] = [impact[0] - h[0] * distance, 0, impact[2] - h[2] * distance];
      // Après le choc : le véhicule poursuit sur une courte distance en déviant légèrement.
      const capFinal = caps[i] + (i === 0 ? -1 : 1) * (Math.PI / 6);
      const fin = cap(capFinal);
      const arrivee: [number, number, number] = [impact[0] + fin[0] * DEFLEXION_DISTANCE * 0.7, 0, impact[2] + fin[2] * DEFLEXION_DISTANCE * 0.7];
      return {
        id: v.id,
        nom: v.conducteurNom,
        plaque: v.plaque,
        type: this.typeVehicule(v.marque),
        zoneChoc: zone(i),
        vitesseKmh,
        depart,
        impact,
        arrivee,
        capDepart: caps[i],
        tImpact: T_IMPACT,
      };
    });
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

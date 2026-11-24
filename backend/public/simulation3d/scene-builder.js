// Construction de la scène 3D à partir des données du dossier (cahier de
// conception §6 — module de reconstitution 3D). Fichier partagé, chargé tel
// quel par la WebView mobile ET par le worker headless (Puppeteer) : un seul
// module 3D à maintenir pour les deux usages, comme prévu par le document.
//
// Décor (route, météo), couleurs et dégâts viennent de l'analyse des photos
// quand elle existe ; sinon la scène reste neutre. Tout est déterministe : une
// même scène donne toujours les mêmes images.
import * as THREE from './vendor/three.module.min.js';

const COULEURS = [0x3d6fd6, 0xd67a3d, 0x4caf50, 0x9c27b0];
const LARGEUR_VOIE = 8;
const RAYON_ROND_POINT = 14;

const DIMENSIONS = {
  voiture: { l: 4.2, larg: 1.8, h: 1.4 },
  moto: { l: 2, larg: 0.8, h: 1.2 },
  camion: { l: 7, larg: 2.4, h: 2.6 },
  bus: { l: 9, larg: 2.5, h: 2.8 },
};

/** Enfoncement de la carrosserie, en fraction de la dimension touchée. */
const ENFONCEMENT = { legere: 0.05, moyenne: 0.12, importante: 0.22 };

const METEO = {
  meteo_beau: { ciel: 0xbfd9f2, hemisphere: 1.1, soleil: 1.4, mouille: false, brouillard: 0 },
  meteo_humide: { ciel: 0xc9d1da, hemisphere: 1.0, soleil: 0.9, mouille: true, brouillard: 0 },
  meteo_pluie: { ciel: 0x8d98a4, hemisphere: 0.85, soleil: 0.45, mouille: true, brouillard: 0.004, pluie: true },
  meteo_brouillard: { ciel: 0xcdd2d6, hemisphere: 0.95, soleil: 0.4, mouille: false, brouillard: 0.02 },
  meteo_nuit: { ciel: 0x0b1220, hemisphere: 0.75, soleil: 0.35, mouille: false, brouillard: 0, nuit: true },
};

function easeInOutQuad(p) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function lerpVec3(a, b, p) {
  return [
    a[0] + (b[0] - a[0]) * p,
    a[1] + (b[1] - a[1]) * p,
    a[2] + (b[2] - a[2]) * p,
  ];
}

/** Générateur pseudo-aléatoire à graine fixe (pluie identique à chaque rendu). */
function generateur(graine) {
  let s = graine;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ------------------------------------------------------------------ véhicules

/**
 * Enfonce et noircit la tôle autour de la zone touchée. Repère du véhicule :
 * avant = +Z, gauche = +X.
 */
function abimer(geometrie, zone, gravite, dims) {
  const axe = zone === 'avant' || zone === 'arriere' ? 'z' : 'x';
  const sens = zone === 'avant' || zone === 'flanc_gauche' ? 1 : -1;
  const demi = (axe === 'z' ? dims.l : dims.larg) / 2;
  const demiTravers = (axe === 'z' ? dims.larg : dims.l) / 2;
  const portee = demi * (axe === 'z' ? 0.45 : 0.9);
  const creux = demi * 2 * (ENFONCEMENT[gravite] ?? 0);
  const pos = geometrie.attributes.position;
  const couleurs = new Float32Array(pos.count * 3).fill(1);
  const hasard = generateur(7);
  for (let i = 0; i < pos.count; i++) {
    const profondeur = (axe === 'z' ? pos.getZ(i) : pos.getX(i)) * sens;
    const travers = axe === 'z' ? pos.getX(i) : pos.getZ(i);
    const proximite = Math.max(0, 1 - (demi - profondeur) / portee);
    // Le choc est plus fort au centre de la face touchée.
    const centre = Math.max(0, 1 - Math.pow(travers / (demiTravers * (axe === 'z' ? 1.3 : 0.7)), 2));
    const force = proximite * centre;
    if (force <= 0) continue;
    const recul = creux * force * (0.8 + 0.4 * hasard());
    if (axe === 'z') pos.setZ(i, pos.getZ(i) - sens * recul);
    else pos.setX(i, pos.getX(i) - sens * recul);
    pos.setY(i, pos.getY(i) - recul * 0.25);
    const ombre = 1 - 0.6 * force;
    couleurs.fill(ombre, i * 3, i * 3 + 3);
  }
  geometrie.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));
  geometrie.computeVertexNormals();
  return geometrie;
}

/** Silhouette low-poly générique — pas de modèles .glb externes (§6.3). */
function construireMaillageVehicule(v, couleur, nuit) {
  const groupe = new THREE.Group();
  const dims = DIMENSIONS[v.type] ?? DIMENSIONS.voiture;
  const moto = v.type === 'moto';
  const tole = new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.45, metalness: 0.25, flatShading: true, vertexColors: true });
  const boite = () => new THREE.BoxGeometry(dims.larg, dims.h * 0.6, dims.l, 8, 4, 16);

  const intacte = boite();
  intacte.setAttribute('color', new THREE.BufferAttribute(new Float32Array(intacte.attributes.position.count * 3).fill(1), 3));
  const corps = new THREE.Mesh(intacte, tole);
  corps.position.y = dims.h * 0.42;
  groupe.add(corps);

  let abime = null;
  if (v.gravite && v.zoneChoc) {
    abime = new THREE.Mesh(abimer(boite(), v.zoneChoc, v.gravite, dims), tole);
    abime.position.copy(corps.position);
    abime.visible = false;
    groupe.add(abime);
  }

  if (!moto) {
    const vitre = new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.15, metalness: 0.4 });
    const grand = v.type === 'bus' || v.type === 'camion';
    const habitacle = new THREE.Mesh(
      new THREE.BoxGeometry(dims.larg * (grand ? 0.96 : 0.85), dims.h * (grand ? 0.34 : 0.4), dims.l * (v.type === 'bus' ? 0.92 : v.type === 'camion' ? 0.28 : 0.48)),
      vitre,
    );
    habitacle.position.set(0, dims.h * (grand ? 0.86 : 0.88), v.type === 'camion' ? dims.l * 0.34 : v.type === 'bus' ? 0 : -dims.l * 0.05);
    groupe.add(habitacle);
    const toit = new THREE.Mesh(new THREE.BoxGeometry(habitacle.geometry.parameters.width, 0.06, habitacle.geometry.parameters.depth), tole);
    toit.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(toit.geometry.attributes.position.count * 3).fill(1), 3));
    toit.position.set(0, habitacle.position.y + habitacle.geometry.parameters.height / 2 + 0.03, habitacle.position.z);
    groupe.add(toit);
  }

  const rayonRoue = moto ? dims.h * 0.24 : dims.h * 0.22;
  const roueGeo = new THREE.CylinderGeometry(rayonRoue, rayonRoue, moto ? 0.14 : 0.28, 16);
  const roueMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const offsets = moto
    ? [[0, dims.l * 0.35], [0, -dims.l * 0.35]]
    : [
        [dims.larg / 2, dims.l * 0.32],
        [-dims.larg / 2, dims.l * 0.32],
        [dims.larg / 2, -dims.l * 0.32],
        [-dims.larg / 2, -dims.l * 0.32],
      ];
  for (const [x, z] of offsets) {
    const roue = new THREE.Mesh(roueGeo, roueMat);
    roue.rotation.z = Math.PI / 2;
    roue.position.set(x, rayonRoue, z);
    groupe.add(roue);
  }

  // Feux avant (blancs) et arrière (rouges) : on voit le sens de marche.
  const ecarts = moto ? [0] : [-0.32, 0.32];
  const feuxCasses = [];
  for (const [couleurFeu, z] of [[0xfff4cf, 1], [0xc81e1e, -1]]) {
    const mat = new THREE.MeshStandardMaterial({ color: couleurFeu, emissive: couleurFeu, emissiveIntensity: nuit ? 1.6 : 0.35 });
    for (const e of ecarts) {
      const feu = new THREE.Mesh(new THREE.BoxGeometry(dims.larg * 0.2, dims.h * 0.12, 0.06), mat);
      feu.position.set(dims.larg * e, dims.h * 0.48, (z * dims.l) / 2);
      groupe.add(feu);
      // Feux du côté enfoncé : cassés à partir du choc.
      if (abime && v.zoneChoc === (z > 0 ? 'avant' : 'arriere')) feuxCasses.push(feu);
    }
  }
  if (nuit) {
    const phare = new THREE.SpotLight(0xfff1c9, 90, 32, 0.5, 0.55, 1.4);
    phare.position.set(0, dims.h * 0.5, dims.l / 2);
    phare.target.position.set(0, 0, dims.l / 2 + 12);
    groupe.add(phare, phare.target);
  }

  const etiquette = construireEtiquette(v.lettre, couleur);
  if (etiquette) {
    etiquette.position.y = dims.h + 1.9;
    groupe.add(etiquette);
  }

  /** Les dégâts n'apparaissent qu'à partir du choc. */
  const montrerDegats = (oui) => {
    if (!abime) return;
    abime.visible = oui;
    corps.visible = !oui;
    for (const feu of feuxCasses) feu.visible = !oui;
  };
  return { groupe, montrerDegats };
}

/** Pastille « A » / « B » : deux véhicules de même couleur restent distincts. */
function construireEtiquette(lettre, couleur) {
  if (!lettre) return null;
  const toile = document.createElement('canvas');
  toile.width = toile.height = 128;
  const ctx = toile.getContext('2d');
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = `#${new THREE.Color(couleur).getHexString()}`;
  ctx.stroke();
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lettre, 64, 70);
  const texture = new THREE.CanvasTexture(toile);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, fog: false }));
  sprite.scale.set(2, 2, 1);
  return sprite;
}

// ---------------------------------------------------------------------- décor

/** Bande horizontale de `longueur` partant de (x, z) dans la direction `cap` (0 = +Z). */
function bande(largeur, longueur, materiau, x, z, cap, y) {
  const pivot = new THREE.Group();
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(largeur, longueur), materiau);
  plan.rotation.x = -Math.PI / 2;
  plan.position.z = longueur / 2;
  pivot.add(plan);
  pivot.position.set(x, y, z);
  pivot.rotation.y = cap;
  return pivot;
}

/** Demi-route depuis le point de choc vers `cap`, avec son marquage. */
function branche(groupe, style, longueur, cap, debut, y) {
  groupe.add(bande(style.largeur, longueur, style.sol, 0, 0, cap, y));
  const dir = [Math.sin(cap), Math.cos(cap)];
  const lateral = [Math.cos(cap), -Math.sin(cap)];
  if (style.trottoir) {
    for (const cote of [-1, 1]) {
      const d = (style.largeur / 2 + 0.9) * cote;
      groupe.add(bande(1.8, longueur - debut, style.trottoir, dir[0] * debut + lateral[0] * d, dir[1] * debut + lateral[1] * d, cap, y + 0.012));
    }
  }
  if (!style.ligne) return;
  for (let d = debut + 1; d < longueur - 2; d += 5) {
    groupe.add(bande(0.16, 2.4, style.ligne, dir[0] * d, dir[1] * d, cap, y + 0.01));
  }
  if (style.rives) {
    for (const cote of [-1, 1]) {
      const d = (style.largeur / 2 - 0.35) * cote;
      groupe.add(bande(0.14, longueur - debut, style.ligne, dir[0] * debut + lateral[0] * d, dir[1] * debut + lateral[1] * d, cap, y + 0.01));
    }
  }
}

function construireRoute(scene, rayon, meteo) {
  const groupe = new THREE.Group();
  const type = scene.route ?? 'carrefour';
  const long = Math.max(rayon * 1.6, 30);
  const asphalte = new THREE.MeshStandardMaterial({
    color: meteo.mouille ? 0x2b2e33 : 0x3a3d42,
    roughness: meteo.mouille ? 0.25 : 0.95,
    metalness: meteo.mouille ? 0.2 : 0,
  });
  const laterite = new THREE.MeshStandardMaterial({ color: meteo.mouille ? 0x6e3f22 : 0xa5673a, roughness: 1 });
  const peinture = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.8 });
  const beton = new THREE.MeshStandardMaterial({ color: 0x9a9c9f, roughness: 1 });
  const style = {
    largeur: type === 'piste' ? 6 : type === 'route_nationale' ? 9 : LARGEUR_VOIE,
    sol: type === 'piste' ? laterite : asphalte,
    ligne: type === 'piste' ? null : peinture,
    rives: type === 'route_nationale',
    trottoir: type === 'route_urbaine' || type === 'carrefour' ? beton : null,
  };

  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(long * 8, long * 8),
    new THREE.MeshStandardMaterial({ color: type === 'piste' ? 0x7f8f55 : 0x8ea16b, roughness: 1 }),
  );
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = -0.04;
  groupe.add(sol);

  if (type === 'parking') {
    const cote = long * 1.6;
    const dalle = new THREE.Mesh(new THREE.PlaneGeometry(cote, cote), asphalte);
    dalle.rotation.x = -Math.PI / 2;
    groupe.add(dalle);
    for (const x of [-1, 1]) {
      for (let z = -cote / 2 + 2; z < cote / 2 - 2; z += 2.8) {
        groupe.add(bande(0.12, 5, peinture, x * 9, z, (x * Math.PI) / 2, 0.01));
      }
    }
    return groupe;
  }

  // Une route par direction d'arrivée : le décor suit l'angle réel du choc.
  const caps = [0];
  for (const v of scene.vehicules) {
    const proche = caps.some((c) => Math.abs(Math.sin(v.capDepart - c)) < 0.26);
    if (!proche) caps.push(v.capDepart);
  }
  // Carrefour : toujours au moins deux routes qui se croisent.
  if (type === 'carrefour' && caps.length === 1) caps.push(Math.PI / 2);
  // Plus les routes se croisent en biais, plus le marquage et les trottoirs s'arrêtent loin du centre.
  const biais = Math.min(1, ...caps.slice(1).map((c) => Math.abs(Math.sin(c))));
  const croisement = caps.length > 1 ? (style.largeur / 2 + 1.5) / Math.max(0.35, biais) + (1 - biais) * 4 : 0;

  caps.forEach((cap, i) => {
    const y = i * 0.002;
    if (i === 0) {
      branche(groupe, style, long, cap, croisement, y);
      branche(groupe, style, long, cap + Math.PI, croisement, y);
      return;
    }
    // Le véhicule arrive du côté opposé à son cap.
    branche(groupe, style, long, cap + Math.PI, croisement, y);
    if (type === 'carrefour') branche(groupe, style, long, cap, croisement, y);
  });

  if (type === 'rond_point') {
    // Anneau tangent à la trajectoire de A au point de choc ; B arrive par l'extérieur.
    const anneau = new THREE.Mesh(
      new THREE.RingGeometry(RAYON_ROND_POINT - style.largeur / 2, RAYON_ROND_POINT + style.largeur / 2, 64),
      asphalte,
    );
    anneau.rotation.x = -Math.PI / 2;
    anneau.position.set(RAYON_ROND_POINT, 0.006, 0);
    groupe.add(anneau);
    const ilot = new THREE.Mesh(
      new THREE.CylinderGeometry(RAYON_ROND_POINT - style.largeur / 2 - 0.3, RAYON_ROND_POINT - style.largeur / 2, 0.35, 48),
      new THREE.MeshStandardMaterial({ color: 0x6f8f4e, roughness: 1 }),
    );
    ilot.position.set(RAYON_ROND_POINT, 0.17, 0);
    groupe.add(ilot);
  }
  return groupe;
}

/** Pluie : traits qui tombent en boucle, position fonction du temps seulement. */
function construirePluie(rayon) {
  const hasard = generateur(42);
  const n = 900;
  const haut = 30;
  const gouttes = Array.from({ length: n }, () => [(hasard() - 0.5) * rayon * 4, hasard() * haut, (hasard() - 0.5) * rayon * 4]);
  const positions = new Float32Array(n * 6);
  const geometrie = new THREE.BufferGeometry();
  geometrie.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const lignes = new THREE.LineSegments(geometrie, new THREE.LineBasicMaterial({ color: 0xc9d6e2, transparent: true, opacity: 0.55 }));
  lignes.frustumCulled = false;
  const avancer = (t) => {
    gouttes.forEach(([x, y0, z], i) => {
      const y = (((y0 - t * 22) % haut) + haut) % haut;
      positions.set([x, y, z, x + 0.06, y + 0.9, z], i * 6);
    });
    geometrie.attributes.position.needsUpdate = true;
  };
  return { lignes, avancer };
}

/**
 * Initialise le rendu Three.js dans `container` à partir de `scene` (JSON
 * produit par `SceneBuilderService` côté backend) et retourne `seekTo(t)`
 * pour positionner l'animation à l'instant `t` (en secondes).
 */
export function initScene(container, scene) {
  const largeur = container.clientWidth || window.innerWidth;
  const hauteur = container.clientHeight || window.innerHeight;
  const meteo = METEO[scene.meteo] ?? METEO.meteo_beau;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(largeur, hauteur);
  renderer.setPixelRatio(1);
  container.appendChild(renderer.domElement);

  const threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(meteo.ciel);
  if (meteo.brouillard) threeScene.fog = new THREE.FogExp2(meteo.ciel, meteo.brouillard);

  threeScene.add(new THREE.HemisphereLight(meteo.nuit ? 0x8fa6d8 : 0xffffff, meteo.nuit ? 0x10151f : 0x556644, meteo.hemisphere));
  const soleil = new THREE.DirectionalLight(meteo.nuit ? 0x9fb4e6 : 0xffffff, meteo.soleil);
  soleil.position.set(30, 60, 20);
  threeScene.add(soleil);

  const rayon = scene.vehicules.reduce(
    (max, v) => Math.max(max, Math.hypot(v.depart[0], v.depart[2])),
    15,
  );
  threeScene.add(construireRoute(scene, rayon, meteo));
  const pluie = meteo.pluie ? construirePluie(rayon) : null;
  if (pluie) threeScene.add(pluie.lignes);

  const camera = new THREE.PerspectiveCamera(45, largeur / hauteur, 0.5, 500);
  const distanceCamera = rayon * 1.5;
  const cameraLoin = new THREE.Vector3(distanceCamera * 0.5, rayon * 1.1, distanceCamera * 0.85);
  // Plan rapproché après le choc : assez près pour voir les dégâts, sans perdre les véhicules.
  const centre = new THREE.Vector3();
  for (const v of scene.vehicules) centre.add(new THREE.Vector3(v.arrivee[0], 0.5, v.arrivee[2]).divideScalar(scene.vehicules.length));
  const envergure = scene.vehicules.reduce(
    (m, v) => Math.max(m, Math.hypot(v.arrivee[0] - centre.x, v.arrivee[2] - centre.z) + (DIMENSIONS[v.type] ?? DIMENSIONS.voiture).l / 2),
    5,
  );
  const cameraPres = cameraLoin.clone().normalize().multiplyScalar(Math.max(16, envergure * 3.2)).add(centre);
  const origine = new THREE.Vector3();
  const viseur = new THREE.Vector3();

  const vehicules = scene.vehicules.map((v, index) => {
    const couleur = v.couleur ? new THREE.Color(v.couleur).getHex() : COULEURS[index % COULEURS.length];
    const { groupe, montrerDegats } = construireMaillageVehicule(v, couleur, !!meteo.nuit);
    threeScene.add(groupe);
    const capArrivee = v.capArrivee ?? Math.atan2(
      v.arrivee[0] - v.impact[0],
      v.arrivee[2] - v.impact[2],
    );
    return { data: v, maillage: groupe, montrerDegats, capArrivee };
  });

  function seekTo(tSecondes) {
    const duree = scene.dureeSecondes || 20;
    const t = Math.min(1, Math.max(0, tSecondes / duree));

    for (const { data, maillage, montrerDegats, capArrivee } of vehicules) {
      let position;
      let cap;
      if (t <= data.tImpact) {
        const p = data.tImpact > 0 ? t / data.tImpact : 1;
        position = lerpVec3(data.depart, data.impact, easeInOutQuad(p));
        cap = data.capDepart;
      } else {
        const p = (t - data.tImpact) / Math.max(1e-6, 1 - data.tImpact);
        position = lerpVec3(data.impact, data.arrivee, easeInOutQuad(p));
        // Rotation par le plus court chemin (sinon un véhicule peut faire un tour complet).
        const ecart = Math.atan2(Math.sin(capArrivee - data.capDepart), Math.cos(capArrivee - data.capDepart));
        cap = data.capDepart + ecart * Math.min(1, p * 2);
      }
      montrerDegats(t >= data.tImpact);
      maillage.position.set(position[0], position[1], position[2]);
      maillage.rotation.y = cap;
    }
    pluie?.avancer(tSecondes);
    const zoom = easeInOutQuad(Math.min(1, Math.max(0, (t - 0.4) / 0.25)));
    camera.position.lerpVectors(cameraLoin, cameraPres, zoom);
    camera.lookAt(viseur.lerpVectors(origine, centre, zoom));

    renderer.render(threeScene, camera);
  }

  seekTo(0);
  return seekTo;
}

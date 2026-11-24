// Construction de la scène 3D à partir des données du dossier (cahier de
// conception §6 — module de reconstitution 3D). Fichier partagé, chargé tel
// quel par la WebView mobile ET par le worker headless (Puppeteer) : un seul
// module 3D à maintenir pour les deux usages, comme prévu par le document.
import * as THREE from './vendor/three.module.min.js';

const COULEURS = [0x3d6fd6, 0xd67a3d, 0x4caf50, 0x9c27b0];

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

/** Silhouette low-poly générique — pas de modèles .glb externes (§6.3). */
function construireMaillageVehicule(type, couleur) {
  const groupe = new THREE.Group();
  const materiau = new THREE.MeshStandardMaterial({ color: couleur });
  const dims = {
    voiture: { l: 4.2, larg: 1.8, h: 1.4 },
    moto: { l: 2, larg: 0.8, h: 1.2 },
    camion: { l: 7, larg: 2.4, h: 2.6 },
    bus: { l: 9, larg: 2.5, h: 2.8 },
  }[type] ?? { l: 4.2, larg: 1.8, h: 1.4 };

  const corps = new THREE.Mesh(
    new THREE.BoxGeometry(dims.larg, dims.h * 0.6, dims.l),
    materiau,
  );
  corps.position.y = dims.h * 0.3;
  groupe.add(corps);

  if (type !== 'moto') {
    const habitacle = new THREE.Mesh(
      new THREE.BoxGeometry(dims.larg * 0.85, dims.h * 0.5, dims.l * 0.45),
      materiau,
    );
    habitacle.position.set(0, dims.h * 0.6 + dims.h * 0.25, -dims.l * 0.05);
    groupe.add(habitacle);
  }

  const roueGeo = new THREE.CylinderGeometry(dims.h * 0.22, dims.h * 0.22, 0.3, 12);
  const roueMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const offsets = type === 'moto'
    ? [[0, 0, dims.l * 0.35], [0, 0, -dims.l * 0.35]]
    : [
        [dims.larg / 2, 0, dims.l * 0.32],
        [-dims.larg / 2, 0, dims.l * 0.32],
        [dims.larg / 2, 0, -dims.l * 0.32],
        [-dims.larg / 2, 0, -dims.l * 0.32],
      ];
  for (const [x, , z] of offsets) {
    const roue = new THREE.Mesh(roueGeo, roueMat);
    roue.rotation.z = Math.PI / 2;
    roue.position.set(x, dims.h * 0.22, z);
    groupe.add(roue);
  }

  return groupe;
}

function construireRoute(rayon) {
  const groupe = new THREE.Group();
  const largeurVoie = 8;
  const materiauRoute = new THREE.MeshStandardMaterial({ color: 0x3a3d42 });
  const long = Math.max(rayon * 2.4, 40);

  const axeZ = new THREE.Mesh(new THREE.PlaneGeometry(largeurVoie, long), materiauRoute);
  axeZ.rotation.x = -Math.PI / 2;
  groupe.add(axeZ);

  const axeX = new THREE.Mesh(new THREE.PlaneGeometry(long, largeurVoie), materiauRoute);
  axeX.rotation.x = -Math.PI / 2;
  groupe.add(axeX);

  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(long * 1.4, long * 1.4),
    new THREE.MeshStandardMaterial({ color: 0x8ea16b }),
  );
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = -0.02;
  groupe.add(sol);

  return groupe;
}

/**
 * Initialise le rendu Three.js dans `container` à partir de `scene` (JSON
 * produit par `SceneBuilderService` côté backend) et retourne `seekTo(t)`
 * pour positionner l'animation à l'instant `t` (en secondes).
 */
export function initScene(container, scene) {
  const largeur = container.clientWidth || window.innerWidth;
  const hauteur = container.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(largeur, hauteur);
  renderer.setPixelRatio(1);
  container.appendChild(renderer.domElement);

  const threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(0xd7dce5);

  threeScene.add(new THREE.HemisphereLight(0xffffff, 0x556644, 1.1));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.4);
  soleil.position.set(30, 60, 20);
  threeScene.add(soleil);

  const rayon = scene.vehicules.reduce(
    (max, v) => Math.max(max, Math.hypot(v.depart[0], v.depart[2])),
    15,
  );
  threeScene.add(construireRoute(rayon));

  const camera = new THREE.PerspectiveCamera(45, largeur / hauteur, 0.5, 500);
  const distanceCamera = rayon * 1.5;
  camera.position.set(distanceCamera * 0.5, rayon * 1.1, distanceCamera * 0.85);
  camera.lookAt(0, 0, 0);

  const vehicules = scene.vehicules.map((v, index) => {
    const maillage = construireMaillageVehicule(v.type, COULEURS[index % COULEURS.length]);
    threeScene.add(maillage);
    const capArrivee = Math.atan2(
      v.arrivee[0] - v.impact[0],
      v.arrivee[2] - v.impact[2],
    );
    return { data: v, maillage, capArrivee };
  });

  function seekTo(tSecondes) {
    const duree = scene.dureeSecondes || 20;
    const t = Math.min(1, Math.max(0, tSecondes / duree));

    for (const { data, maillage, capArrivee } of vehicules) {
      let position;
      let cap;
      if (t <= data.tImpact) {
        const p = data.tImpact > 0 ? t / data.tImpact : 1;
        position = lerpVec3(data.depart, data.impact, easeInOutQuad(p));
        cap = data.capDepart;
      } else {
        const p = (t - data.tImpact) / Math.max(1e-6, 1 - data.tImpact);
        position = lerpVec3(data.impact, data.arrivee, easeInOutQuad(p));
        cap = data.capDepart + (capArrivee - data.capDepart) * Math.min(1, p * 2);
      }
      maillage.position.set(position[0], position[1], position[2]);
      maillage.rotation.y = cap;
    }

    renderer.render(threeScene, camera);
  }

  seekTo(0);
  return seekTo;
}

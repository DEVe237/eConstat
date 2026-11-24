// Test de bout en bout : application mobile → dashboard autorités → assureur.
// Prérequis : API démarrée (npm run start:dev) et base de données disponible.
// Lancement : npm run test:dashboard   (API_URL=http://localhost:3000 par défaut)
// Crée des comptes et des dossiers de test dans la base ciblée : à n'utiliser qu'en développement.
import { readFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { createRequire } from 'module';
const { video, DOCUMENTS } = createRequire(import.meta.url)('./outils.cjs');

const API = process.env.API_URL ?? 'http://localhost:3000';
const ENV = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const envv = (k) => ENV.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1].trim();
let ok = 0;
let ko = 0;
// Vérification dépendant d'un service externe (autorité d'horodatage) : avertissement, pas échec.
const avertir = (cond, msg) => console.log(`${cond ? 'OK  ' : 'WARN'} ${msg}${cond ? '' : ' (service externe indisponible ?)'}`);
const check = (cond, msg) => {
  cond ? ok++ : ko++;
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${msg}`);
};

async function call(path, { method = 'GET', token, cookie, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  let body;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  if (form) body = form;
  const r = await fetch(API + path, { method, headers, body });
  const type = r.headers.get('content-type') || '';
  const data = type.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer());
  return { status: r.status, data, headers: r.headers };
}

/** Petite image PNG valide (dégradé) générée sans dépendance. */
function png(l = 64, h = 48) {
  const crc = (buf) => {
    let c = ~0;
    for (const b of buf) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(l, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const lignes = [];
  for (let y = 0; y < h; y++) {
    lignes.push(0);
    // bruit : l'image se compresse mal, ce qui permet de dépasser 100 Ko
    for (let x = 0; x < l; x++) lignes.push((x * 4) & 255, (y * 5) & 255, (Math.random() * 256) | 0);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.from(lignes))), chunk('IEND', Buffer.alloc(0))]);
}

const stamp = Date.now();
const image = png();

// --- comptes ------------------------------------------------------------------
const admin = await call('/auth/login', { method: 'POST', json: { email: envv('ADMIN_EMAIL'), motDePasse: envv('ADMIN_PASSWORD') } });
check(admin.status === 201 && admin.data.user.role === 'administrateur', 'connexion administrateur');
const tA = admin.data.accessToken;
const cookieAdmin = (admin.headers.get('set-cookie') || '').split(';')[0];
check(/^camairconst_session=/.test(cookieAdmin) && /HttpOnly/i.test(admin.headers.get('set-cookie')) && /SameSite=Strict/i.test(admin.headers.get('set-cookie')), 'cookie de session httpOnly + SameSite=Strict');
check((await call('/auth/moi', { cookie: cookieAdmin })).data.role === 'administrateur', 'session web par cookie (/auth/moi)');

const mdpAgent = `Agent-${stamp}`;
const creeAgent = await call('/admin/utilisateurs', { method: 'POST', token: tA, json: { prenom: 'Paul', nom: 'Essomba', email: `agent.${stamp}@test.local`, motDePasse: mdpAgent, role: 'agent', matricule: 'PN-4521', unite: 'Commissariat central' } });
check(creeAgent.status === 201 && !('motDePasseHash' in creeAgent.data), 'création compte agent (sans fuite du hash)');
const tG = (await call('/auth/login', { method: 'POST', json: { email: `agent.${stamp}@test.local`, motDePasse: mdpAgent } })).data.accessToken;

const compagnie = `Assurances Test ${stamp}`;
check((await call('/admin/utilisateurs', { method: 'POST', token: tA, json: { prenom: 'A', nom: 'B', email: `x.${stamp}@test.local`, motDePasse: 'Assureur-123', role: 'assureur' } })).status === 400, 'assureur sans compagnie refusé');
const creeAss = await call('/admin/utilisateurs', { method: 'POST', token: tA, json: { prenom: 'Marie', nom: 'Ngo', email: `assureur.${stamp}@test.local`, motDePasse: `Assureur-${stamp}`, role: 'assureur', compagnie } });
check(creeAss.status === 201 && creeAss.data.compagnie === compagnie, 'création compte assureur');
const tS = (await call('/auth/login', { method: 'POST', json: { email: `assureur.${stamp}@test.local`, motDePasse: `Assureur-${stamp}` } })).data.accessToken;

const conducteur = async (n) => (await call('/auth/register', { method: 'POST', json: { nom: 'Conducteur', prenom: n, email: `${n}.${stamp}@test.local`, motDePasse: `Usager-${stamp}` } })).data.accessToken;
const tU = await conducteur('usager');
const tU2 = await conducteur('autre');

// --- contrôle d'accès -----------------------------------------------------------
check((await call('/dossiers')).status === 401, 'routes mobiles : connexion obligatoire');
check((await call('/dashboard/dossiers', { token: tU })).status === 403, 'conducteur refusé sur /dashboard');
check((await call('/admin/utilisateurs', { token: tG })).status === 403, 'agent refusé sur /admin');
check((await call('/dashboard/statistiques', { token: tS })).status === 403, 'assureur refusé sur les statistiques');

// --- profil du conducteur ---------------------------------------------------------
const profil = await call('/auth/moi', { method: 'PATCH', token: tU, json: { telephone: '+237 699 00 11 22', adresse: 'Bastos, Yaoundé', assurance: 'Assureur Test 123', permisConduire: 'CM-0001', role: 'administrateur', email: 'pirate@test.local' } });
check(profil.status === 200 && profil.data.adresse === 'Bastos, Yaoundé' && !('motDePasseHash' in profil.data), 'profil enregistré sur le serveur');
check(profil.data.role === 'usager' && profil.data.email !== 'pirate@test.local', 'profil : rôle et e-mail non modifiables');
check((await call('/auth/moi', { method: 'PATCH', token: tU, json: { adresse: '' } })).data.adresse === null, 'profil : un champ facultatif peut être vidé');
check((await call('/auth/moi', { method: 'PATCH', token: tU, json: { nom: '' } })).status === 400, 'profil : nom vide refusé');
check((await call('/auth/moi', { method: 'PATCH', token: tG, json: { nom: 'Autre' } })).status === 403, 'profil : un agent ne change pas son identité lui-même');

// --- constat depuis l'application mobile ----------------------------------------
const d = await call('/dossiers', { method: 'POST', token: tU, json: { dateAccident: new Date(Date.now() - 40 * 60000).toISOString(), lat: 3.86686, lng: 11.51684, pointDeChoc: 'avant', conditionsMeteo: 'meteo_pluie' } });
const id = d.data.id;
check(d.status === 201 && d.data.proprietaireId, 'création du dossier, rattaché au conducteur');
await call(`/dossiers/${id}/vehicules`, { method: 'POST', token: tU, json: { conducteurNom: 'Tamtampion', plaque: 'AA-12-AB', marque: 'Toyota', vitesseEstimee: '30', sensCirculation: 'droite', zoneChoc: 'avant' } });
await call(`/dossiers/${id}/vehicules`, { method: 'POST', token: tU, json: { conducteurNom: 'Camair', plaque: 'CC-456-DD', marque: 'Corolla', vitesseEstimee: '35', sensCirculation: 'gauche', zoneChoc: 'avant' } });
check((await call(`/dossiers/${id}/vehicules`, { method: 'POST', token: tU2, json: { conducteurNom: 'Intrus', plaque: 'ZZ' } })).status === 404, 'un autre conducteur ne peut pas modifier le dossier');
check((await call(`/dossiers/${id}`, { token: tU2 })).status === 404, 'un autre conducteur ne peut pas lire le dossier');
check(!(await call('/dossiers', { token: tU2 })).data.some((x) => x.id === id), 'historique : seulement ses propres dossiers');

const fd = new FormData();
fd.append('file', new Blob([image], { type: 'image/png' }), 'photo.png');
const m = await call(`/dossiers/${id}/media?type=photo`, { method: 'POST', token: tU, form: fd });
check(m.status === 201 && /^[0-9a-f]{64}$/.test(m.data.empreinte) && m.data.url.startsWith('/fichiers/'), 'photo reçue, empreinte SHA-256, lien signé');
const fdTxt = new FormData();
fdTxt.append('file', new Blob(['<script>'], { type: 'text/html' }), 'x.html');
check((await call(`/dossiers/${id}/media?type=photo`, { method: 'POST', token: tU, form: fdTxt })).status === 400, 'fichier non image/vidéo refusé');

// capture guidée : catégories, conducteur, documents absents, durée de la vidéo du tour
const envoyer = (q, type = 'image/png', nom = 'p.png', contenu = image) => {
  const f = new FormData();
  f.append('file', new Blob([contenu], { type }), nom);
  return call(`/dossiers/${id}/media?${q}`, { method: 'POST', token: tU, form: f });
};
const plaqueA = await envoyer('type=photo&categorie=plaque&conducteur=A');
check(plaqueA.status === 201 && plaqueA.data.categorie === 'plaque' && plaqueA.data.conducteur === 'A', 'photo guidée : plaque du véhicule A');
check((await envoyer('type=photo&categorie=plaque')).status === 400, 'photo de plaque sans conducteur refusée');
check((await envoyer('type=photo&categorie=inconnue')).status === 400, 'catégorie inconnue refusée');
check((await envoyer('type=photo&categorie=carte_grise&conducteur=B')).status === 201, 'document : carte grise du conducteur B');
const v38 = video(38);
check((await envoyer('type=video&categorie=video_tour&duree=38', 'video/mp4', 'v.mp4', video(12))).status === 400, 'vidéo de 12 s annoncée 38 s refusée (durée mesurée par le serveur)');
check((await envoyer('type=video&categorie=video_tour&duree=38', 'video/mp4', 'v.mp4', video(60))).status === 400, 'vidéo de 60 s annoncée 38 s refusée');
check((await envoyer('type=video&categorie=video_tour&duree=38', 'video/mp4', 'v.mp4')).status === 400, 'fausse vidéo refusée');
const tour = await envoyer('type=video&categorie=video_tour', 'video/mp4', 'v.mp4', v38);
check(tour.status === 201 && Math.abs(tour.data.dureeSecondes - 38) < 1, `vidéo du tour acceptée, durée mesurée ${tour.data.dureeSecondes} s`);
const plaqueBis = await envoyer('type=photo&categorie=plaque&conducteur=A');
const mediasA = (await call(`/dossiers/${id}`, { token: tU })).data.medias.filter((x) => x.categorie === 'plaque' && x.conducteur === 'A');
check(mediasA.length === 1 && mediasA[0].id === plaqueBis.data.id, 'reprise ou renvoi : la photo remplace la précédente, sans doublon');
const abs = await call(`/dossiers/${id}/documents-absents`, { method: 'PUT', token: tU, json: { documents: [{ conducteur: 'A', categorie: 'visite_technique' }, { conducteur: 'A', categorie: 'visite_technique' }, { conducteur: 'B', categorie: 'permis' }] } });
check(abs.status === 200 && abs.data.length === 2, '« Je n’ai pas ce document » enregistré (doublons fusionnés)');
check((await call(`/dossiers/${id}/documents-absents`, { method: 'PUT', token: tU, json: { documents: [{ conducteur: 'C', categorie: 'permis' }] } })).status === 400, 'document absent invalide refusé');

const maj = await call(`/dossiers/${id}`, { method: 'PATCH', token: tU, json: { conditionsMeteo: 'meteo_pluie' } });
check(maj.status === 200 && maj.data.conditionsMeteo === 'meteo_pluie', 'circonstances complétées après la capture (PATCH)');
check((await call(`/dossiers/${id}`, { method: 'PATCH', token: tU2, json: { conditionsMeteo: 'x' } })).status === 404, 'PATCH refusé à un autre conducteur');

// analyse IA : sans clé, statut « indisponible » sans bloquer le dossier
const ia = await call(`/dossiers/${id}/analyse-ia`, { method: 'POST', token: tU });
const iaDispo = (await call(`/dossiers/${id}/analyse-ia`, { token: tU })).data.disponible;
check(ia.status === 201 && (iaDispo ? ['terminee', 'echouee'] : ['indisponible']).includes(ia.data.statut), `analyse IA : ${ia.data.statut}${ia.data.erreur ? ` (${ia.data.erreur})` : ''}`);
check((await call(`/dossiers/${id}/analyse-ia`, { method: 'POST', token: tU2 })).status === 404, 'analyse IA refusée à un autre conducteur');

const grosse = png(400, 300).toString('base64');
check(grosse.length > 100_000, `signature volumineuse (${Math.round(grosse.length / 1024)} Ko)`);
const sA = await call(`/dossiers/${id}/signature`, { method: 'POST', token: tU, json: { conducteurNom: 'Tamtampion', imageBase64: grosse } });
check(sA.status === 201, 'signature A (> 100 Ko) acceptée');
check((await call(`/dossiers/${id}/signature`, { method: 'POST', token: tU, json: { conducteurNom: 'Camair', imageBase64: image.toString('base64') } })).status === 201, 'signature B');

// fichiers : lien signé obligatoire
const lienPhoto = m.data.url;
check((await call(lienPhoto)).status === 200, 'photo accessible par lien signé');
check((await call(lienPhoto.replace(/sig=[^&]+/, 'sig=faux'))).status === 403, 'lien falsifié refusé');
check((await call(lienPhoto.replace(/exp=\d+/, 'exp=1'))).status === 403, 'lien expiré refusé');
check((await call(lienPhoto.split('?')[0].replace('/fichiers/', '/uploads/'))).status === 404, 'plus d’accès public sous /uploads');

check((await call(`/dashboard/dossiers/${id}`, { token: tG })).status === 404, 'brouillon invisible pour les autorités');
const incomplet = await call(`/dossiers/${id}/soumettre`, { method: 'POST', token: tU });
check(incomplet.status === 400 && /incomplet/.test(incomplet.data.message) && /plaque B/.test(incomplet.data.message), 'dossier incomplet refusé, éléments manquants indiqués');
for (const q of ['categorie=vue_ensemble', 'categorie=plaque&conducteur=B', 'categorie=vehicule&conducteur=A', 'categorie=vehicule&conducteur=B']) await envoyer(`type=photo&${q}`);
const tousAbsents = ['A', 'B'].flatMap((c) => DOCUMENTS.map((categorie) => ({ conducteur: c, categorie }))).filter((x) => !(x.conducteur === 'B' && x.categorie === 'carte_grise'));
await call(`/dossiers/${id}/documents-absents`, { method: 'PUT', token: tU, json: { documents: tousAbsents } });
// Photo d'un document déclaré absent : la photo l'emporte.
await envoyer('type=photo&categorie=cni&conducteur=A');
const apres = (await call(`/dossiers/${id}`, { token: tU })).data;
check(!apres.documentsAbsents.some((x) => x.categorie === 'cni' && x.conducteur === 'A'), 'photographier un document annule sa déclaration d’absence');
// Renvoi des véhicules et des signatures (coupure réseau) : pas de doublon.
const vehicules = [
  { conducteurNom: 'Tamtampion', plaque: 'AA-12-AB', marque: 'Toyota', vitesseEstimee: '30', sensCirculation: 'droite', zoneChoc: 'avant' },
  { conducteurNom: 'Camair', plaque: 'CC-456-DD', marque: 'Corolla', vitesseEstimee: '35', sensCirculation: 'gauche', zoneChoc: 'avant' },
];
for (let i = 0; i < 2; i++) await call(`/dossiers/${id}/vehicules`, { method: 'PUT', token: tU, json: { vehicules } });
await call(`/dossiers/${id}/signature`, { method: 'POST', token: tU, json: { conducteurNom: 'Camair', imageBase64: image.toString('base64') } });
const reprise = (await call(`/dossiers/${id}`, { token: tU })).data;
check(reprise.vehiculesImpliques.length === 2 && reprise.signatures.length === 2, 'renvoi des véhicules et signatures sans doublon');
const s = await call(`/dossiers/${id}/soumettre`, { method: 'POST', token: tU });
check(s.status === 201 && s.data.statut === 'transmis' && /^[0-9a-f]{64}$/.test(s.data.hashIntegrite), 'transmission + empreinte du dossier');
if (envv('TSA_URL')) avertir(!!s.data.horodatageDate && !!s.data.horodatageAutorite, `horodatage certifié (${s.data.horodatageAutorite ?? 'échec'})`);
check((await call(`/dossiers/${id}/signature`, { method: 'POST', token: tU, json: { conducteurNom: 'Intrus', imageBase64: image.toString('base64') } })).status === 409, 'dossier verrouillé après transmission');
check((await call(`/dossiers/${id}/soumettre`, { method: 'POST', token: tU })).status === 409, 'double transmission refusée');

// --- 3D -------------------------------------------------------------------------
const sim = await call(`/dossiers/${id}/simulation3d`, { method: 'POST', token: tU });
check(sim.status === 201 && sim.data.sceneUrl?.includes('sig='), 'génération 3D lancée par le conducteur, lien de visionneuse signé');
check((await call(`/dossiers/${id}/simulation3d`, { method: 'POST', token: tU2 })).status === 404, 'un autre conducteur ne peut pas lancer la 3D');
const qs = new URL(sim.data.sceneUrl, API).searchParams;
check((await call(`/dossiers/${id}/simulation3d/scene?exp=${qs.get('exp')}&sig=${qs.get('sig')}`)).status === 200, 'scène 3D lisible avec le lien signé');
check((await call(`/dossiers/${id}/simulation3d/scene`)).status === 403, 'scène 3D refusée sans lien signé');

// --- dashboard agent --------------------------------------------------------------
const liste = await call('/dashboard/dossiers?statut=transmis', { token: tG });
const numero = liste.data.items.find((x) => x.id === id)?.numero;
check(!!numero, `dossier ${numero} dans « À traiter »`);
check((await call(`/dashboard/dossiers?q=${encodeURIComponent('CC-456')}`, { token: tG })).data.items.some((x) => x.id === id), 'recherche par plaque');
check((await call(`/dashboard/dossiers?lat=3.8669&lng=11.5168&rayonKm=1`, { token: tG })).data.items.some((x) => x.id === id), 'filtre par zone');
const det = await call(`/dashboard/dossiers/${id}`, { token: tG });
check(det.status === 200 && det.data.vehiculesImpliques.length === 2 && det.data.signatures.length === 2 && det.data.medias.length === 9 && det.data.documentsAbsents.length === 10 && det.data.analyseIA, 'détail complet (médias catégorisés, documents absents, analyse IA)');
check(det.data.vehiculesImpliques[0].conducteurNom === 'Tamtampion', 'véhicules dans l’ordre de saisie (A puis B)');
check(det.data.medias[0].url.startsWith('/fichiers/') && det.data.sceneUrl.includes('sig=') && !('horodatageJeton' in det.data), 'détail : liens signés, jeton brut non exposé');

const tem = await call(`/dashboard/dossiers/${id}/temoignages`, { method: 'POST', token: tG, json: { temoinNom: 'Jean Mballa', temoinTelephone: '699000000', recit: 'J’ai vu le véhicule B tourner à gauche sans céder le passage.' } });
check(tem.status === 201 && tem.data.temoignages.length === 1 && tem.data.temoignages[0].recueilliPar === 'Paul Essomba', 'témoignage recueilli par l’agent');
check((await call(`/dashboard/dossiers/${id}/completer`, { method: 'POST', token: tG, json: { commentaire: 'Chaussée glissante confirmée sur place.' } })).status === 201, 'complément');
check((await call(`/dashboard/dossiers/${id}/contester`, { method: 'POST', token: tG, json: {} })).status === 400, 'contestation sans motif refusée');
check((await call(`/dashboard/dossiers/${id}/valider`, { method: 'POST', token: tG, json: { commentaire: 'Sans conclusion.' } })).status === 400, 'validation sans conclusion refusée');
check((await call(`/dashboard/dossiers/${id}/valider`, { method: 'POST', token: tG, json: { responsabilite: 'A' } })).status === 400, 'validation sans justification refusée');
check((await call(`/dashboard/dossiers/${id}/valider`, { method: 'POST', token: tG, json: { responsabilite: 'partagee', commentaire: 'x' } })).status === 400, 'responsabilité partagée sans pourcentage refusée');
check((await call(`/dashboard/dossiers/${id}/valider`, { method: 'POST', token: tG, json: { responsabilite: 'partagee', partResponsabiliteA: 100, commentaire: 'x' } })).status === 400, 'pourcentage hors bornes refusé');
const val = await call(`/dashboard/dossiers/${id}/valider`, { method: 'POST', token: tG, json: { responsabilite: 'partagee', partResponsabiliteA: 70, commentaire: 'Déclarations concordantes ; B roulait trop vite.' } });
check(val.status === 201 && val.data.statut === 'valide' && val.data.agentTraitant?.matricule === 'PN-4521', 'validation tracée (matricule)');
check(val.data.conclusion?.responsabilite === 'partagee' && val.data.conclusion.partResponsabiliteA === 70 && /A 70 % \/ B 30 %/.test(val.data.conclusion.libelle), `conclusion enregistrée : ${val.data.conclusion?.libelle}`);

// --- assureur ---------------------------------------------------------------------
check((await call(`/dashboard/dossiers/${id}`, { token: tS })).status === 404, 'assureur : dossier non transmis invisible');
check(!(await call('/dashboard/dossiers', { token: tS })).data.items.some((x) => x.id === id), 'assureur : liste vide avant transmission');
check((await call('/dashboard/assureurs', { token: tG })).data.includes(compagnie), 'liste des compagnies');
check((await call(`/dashboard/dossiers/${id}/transmettre-assureur`, { method: 'POST', token: tG, json: { compagnie: 'Inconnue SA' } })).status === 400, 'compagnie inconnue refusée');
const tr = await call(`/dashboard/dossiers/${id}/transmettre-assureur`, { method: 'POST', token: tG, json: { compagnie } });
check(tr.status === 201 && tr.data.transmissionsAssureurs.length === 1, 'transmission à l’assureur');
check((await call('/dashboard/dossiers', { token: tS })).data.items.some((x) => x.id === id), 'assureur : dossier visible après transmission');
check((await call(`/dashboard/dossiers/${id}/valider`, { method: 'POST', token: tS, json: {} })).status === 403, 'assureur en lecture seule');
const pdf = await call(`/dashboard/dossiers/${id}/export.pdf`, { token: tS });
check(pdf.status === 200 && pdf.data.subarray(0, 4).toString() === '%PDF', `export PDF par l’assureur (${Math.round(pdf.data.length / 1024)} Ko)`);
if (envv('TSA_URL') && s.data.horodatageDate) check((await call(`/dashboard/dossiers/${id}/horodatage.tsr`, { token: tS })).data.length > 1000, 'preuve d’horodatage téléchargeable (.tsr)');

const hist = (await call(`/dashboard/dossiers/${id}`, { token: tG })).data.evenements.map((e) => e.type).join(',');
check(hist === 'creation,transmission,temoignage,complement,validation,envoi_assureur', `historique : ${hist}`);
check((await call('/dashboard/statistiques', { token: tG })).data.points.some((p) => p.id === id), 'statistiques');

// --- comptes ----------------------------------------------------------------------
check((await call('/auth/mot-de-passe', { method: 'POST', token: tG, json: { actuel: 'faux-mot-de-passe', nouveau: 'Nouveau-12345' } })).status === 401, 'changement de mot de passe : ancien vérifié');
check((await call('/auth/mot-de-passe', { method: 'POST', token: tG, json: { actuel: mdpAgent, nouveau: `Nouveau-${stamp}` } })).status === 204, 'changement de mot de passe');
check((await call('/auth/login', { method: 'POST', json: { email: `agent.${stamp}@test.local`, motDePasse: `Nouveau-${stamp}` } })).status === 201, 'connexion avec le nouveau mot de passe');
check((await call(`/admin/utilisateurs/${admin.data.user.id}`, { method: 'PATCH', token: tA, json: { actif: false } })).status === 400, 'l’administrateur ne peut pas se désactiver lui-même');
await call(`/admin/utilisateurs/${creeAgent.data.id}`, { method: 'PATCH', token: tA, json: { actif: false } });
check((await call('/dashboard/dossiers', { token: tG })).status === 401, 'agent désactivé : accès coupé immédiatement');

console.log(`\n${ok} OK, ${ko} échec(s) — dossier ${numero} (${id})`);
process.exitCode = ko ? 1 : 0;

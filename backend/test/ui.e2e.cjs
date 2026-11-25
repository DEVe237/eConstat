// Test d'interface du dashboard : agent puis assureur, dans un vrai navigateur (Puppeteer),
// via le relais /api du site (cookie de session).
// Prérequis : API (port 3000) et dashboard web (port 3001) démarrés.
// Lancement : npm run test:ui   (WEB_URL / API_URL pour d'autres adresses)
// Crée des comptes et un dossier de test : à n'utiliser qu'en développement.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { video, DOCUMENTS } = require('./outils.cjs');
const WEB = process.env.WEB_URL ?? 'http://localhost:3001';
const API = process.env.API_URL ?? 'http://localhost:3000';
const ENV = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const envv = (k) => ENV.match(new RegExp(`^${k}=(.*)$`, 'm'))[1].trim();
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
// Attend qu'une condition soit vraie dans la page (au lieu d'un délai fixe).
const attendre = (page, fn, arg) => page.waitForFunction(fn, { timeout: 45000 }, arg).then(() => true).catch(() => false);
let ok = 0, ko = 0;
const check = (c, m) => { c ? ok++ : ko++; console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); };

async function apiCall(p, { method = 'GET', token, json } = {}) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  const r = await fetch(API + p, { method, headers: h, body: json ? JSON.stringify(json) : undefined });
  return r.json().catch(() => null);
}

async function connexion(page, email, mdp) {
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type=email]', email);
  await page.type('input[type=password]', mdp);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}), page.click('button[type=submit]')]);
  await page.waitForSelector('h1');
}
const cliquerTexte = async (page, texte) => {
  const ok_ = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t);
    if (b) b.click();
    return !!b;
  }, texte);
  if (!ok_) throw new Error(`bouton introuvable : ${texte}`);
};

(async () => {
  const stamp = Date.now();
  // Préparation par l'API : un conducteur transmet un constat ; l'admin crée un agent et un assureur.
  const tA = (await apiCall('/auth/login', { method: 'POST', json: { email: envv('ADMIN_EMAIL'), motDePasse: envv('ADMIN_PASSWORD') } })).accessToken;
  const compagnie = `Assurances UI ${stamp}`;
  await apiCall('/admin/utilisateurs', { method: 'POST', token: tA, json: { prenom: 'Paul', nom: 'Essomba', email: `ui.agent.${stamp}@test.local`, motDePasse: `Agent-${stamp}`, role: 'agent', matricule: 'PN-4521', unite: 'Commissariat central' } });
  await apiCall('/admin/utilisateurs', { method: 'POST', token: tA, json: { prenom: 'Marie', nom: 'Ngo', email: `ui.assur.${stamp}@test.local`, motDePasse: `Assur-${stamp}`, role: 'assureur', compagnie } });
  const tU = (await apiCall('/auth/register', { method: 'POST', json: { nom: 'Kamga', prenom: 'Eric', email: `ui.cond.${stamp}@test.local`, motDePasse: `Cond-${stamp}` } })).accessToken;
  const d = await apiCall('/dossiers', { method: 'POST', token: tU, json: { dateAccident: new Date(Date.now() - 3600e3).toISOString(), lat: 3.8664, lng: 11.5162, pointDeChoc: 'avant', conditionsMeteo: 'meteo_pluie' } });
  await apiCall(`/dossiers/${d.id}/vehicules`, { method: 'POST', token: tU, json: { conducteurNom: 'Eric Kamga', plaque: 'CE-482-AB', marque: 'Toyota Corolla', vitesseEstimee: '30', sensCirculation: 'droite', zoneChoc: 'avant' } });
  await apiCall(`/dossiers/${d.id}/vehicules`, { method: 'POST', token: tU, json: { conducteurNom: 'Aline Fotso', plaque: 'LT-219-CD', marque: 'Hyundai Tucson', vitesseEstimee: '35', sensCirculation: 'gauche', zoneChoc: 'avant' } });
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const envoyer = async (q, contenu, type, nom) => {
    const f = new FormData();
    f.append('file', new Blob([contenu], { type }), nom);
    await fetch(`${API}/dossiers/${d.id}/media?${q}`, { method: 'POST', headers: { Authorization: `Bearer ${tU}` }, body: f });
  };
  for (const q of ['categorie=vue_ensemble', ...['A', 'B'].flatMap((c) => [`categorie=plaque&conducteur=${c}`, `categorie=vehicule&conducteur=${c}`])]) await envoyer(`type=photo&${q}`, Buffer.from(b64, 'base64'), 'image/png', 'p.png');
  await envoyer('type=video&categorie=video_tour', video(35), 'video/mp4', 'v.mp4');
  await apiCall(`/dossiers/${d.id}/documents-absents`, { method: 'PUT', token: tU, json: { documents: ['A', 'B'].flatMap((conducteur) => DOCUMENTS.map((categorie) => ({ conducteur, categorie }))) } });
  for (const conducteurNom of ['Eric Kamga', 'Aline Fotso']) await apiCall(`/dossiers/${d.id}/signature`, { method: 'POST', token: tU, json: { conducteurNom, imageBase64: b64 } });
  const transmis = await apiCall(`/dossiers/${d.id}/soumettre`, { method: 'POST', token: tU });
  if (transmis?.statut !== 'transmis') throw new Error(`préparation : ${JSON.stringify(transmis)}`);

  const b = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const erreurs = [];
  const nouvellePage = async () => {
    const p = await (await b.createBrowserContext()).newPage();
    await p.setViewport({ width: 1440, height: 900 });
    p.setDefaultNavigationTimeout(90000);
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
    return p;
  };

  // --- agent
  const p = await nouvellePage();
  await connexion(p, `ui.agent.${stamp}@test.local`, `Agent-${stamp}`);
  check(await attendre(p, () => location.pathname === '/tableau-de-bord' && document.body.innerText.includes('Paul Essomba') && document.body.innerText.includes('Derniers dossiers à traiter')), 'agent connecté → tableau de bord');
  const stockage = await p.evaluate(() => JSON.stringify(localStorage) + document.cookie);
  check(!/eyJ/.test(stockage), 'aucun jeton accessible au JavaScript (cookie httpOnly)');
  check(await attendre(p, () => /\d+/.test([...document.querySelectorAll('aside a')].find((a) => a.textContent.startsWith('Dossiers'))?.textContent ?? '')), 'badge « dossiers à traiter » dans le menu');
  await p.goto(`${WEB}/dossiers/${d.id}`, { waitUntil: 'networkidle0' });
  await pause(3000);
  const scene = await p.evaluate(() => document.querySelector('iframe')?.getAttribute('src') ?? '');
  check(scene.startsWith('/api/simulation3d/scene.html') && scene.includes('sig='), 'visionneuse 3D chargée par lien signé');
  const sceneOk = await p.frames().find((f) => f.url().includes('scene.html'))?.evaluate(() => window.__sceneReady === true && !document.getElementById('erreur').textContent);
  check(sceneOk, 'scène 3D affichée sans erreur dans l’iframe');
  // Rendu 3D logiciel : une fois vérifié, il ne doit pas saturer le processeur pour la suite.
  const sansScene = async (page) => {
    await page.setRequestInterception(true);
    page.on('request', (r) => (r.url().includes('scene.html') ? r.respond({ contentType: 'text/html', body: '' }) : r.continue()));
    await page.evaluate(() => document.querySelectorAll('iframe').forEach((f) => (f.src = 'about:blank')));
  };
  await sansScene(p);

  await cliquerTexte(p, 'Prendre en charge');
  check(await attendre(p, () => document.body.innerText.includes('En traitement par Paul Essomba')), 'prise en charge depuis l’interface');

  await cliquerTexte(p, 'Témoignage');
  await p.waitForSelector('[role=dialog] textarea');
  const champs = await p.$$('[role=dialog] input');
  await champs[0].type('Jean Mballa');
  await champs[1].type('699 00 00 00');
  await p.type('[role=dialog] textarea', 'Le véhicule B a tourné à gauche sans céder le passage.');
  await cliquerTexte(p, 'Enregistrer le témoignage');
  check(await attendre(p, () => document.body.innerText.includes('Jean Mballa') && document.body.innerText.includes('recueilli par Paul Essomba')), 'témoignage enregistré depuis l’interface');

  await cliquerTexte(p, 'Transmettre à l’assureur');
  await p.waitForSelector('[role=dialog] select');
  await p.select('[role=dialog] select', compagnie);
  check(await p.evaluate(() => document.querySelector('[role=dialog]').innerText.includes('pas encore de conclusion')), 'transfert sans conclusion : avertissement');
  await p.type('[role=dialog] textarea', 'Vérifier les freins du véhicule B.');
  await cliquerTexte(p, 'Transmettre');
  check(await attendre(p, (c) => !document.querySelector('[role=dialog]') && document.body.innerText.includes(c) && document.body.innerText.includes('Vérifier les freins du véhicule B.'), compagnie), 'dossier transmis à l’assureur avec une remarque');

  if (process.env.CAPTURE) await p.screenshot({ path: process.env.CAPTURE });
  await cliquerTexte(p, 'Valider le dossier');
  check(await attendre(p, () => document.body.innerText.includes('Indiquez qui a raison')), 'conclusion obligatoire pour valider');
  await p.evaluate(() => [...document.querySelectorAll('[role=radiogroup] label')].find((x) => x.textContent.includes('A a raison (Eric Kamga)')).click());
  await cliquerTexte(p, 'Valider le dossier');
  check(await attendre(p, () => document.body.innerText.includes('remarques justifiant la conclusion sont obligatoires')), 'remarques obligatoires pour valider');
  await p.type('#justification', 'Déclarations et témoignage concordants.');
  await cliquerTexte(p, 'Valider le dossier');
  check(await attendre(p, () => document.body.innerText.includes('Validé par Paul Essomba') && document.body.innerText.includes('Conclusion : conducteur B responsable (0 % / 100 %), le conducteur A a raison') && !document.querySelector('[role=radiogroup]')), 'validation avec conclusion depuis l’interface');
  await p.evaluate(() => [...document.querySelectorAll('[role=tab]')].find((x) => x.textContent.includes('Photos et pièces')).click());
  check(await attendre(p, () => document.body.innerText.includes('Pièces justificatives')), 'pièces justificatives affichées');
  await p.keyboard.down('Control');
  await p.keyboard.press('k');
  await p.keyboard.up('Control');
  await p.waitForSelector('[role=dialog] input');
  await p.type('[role=dialog] input', d.id.slice(0, 8));
  check(await attendre(p, (n) => document.querySelector('[role=dialog]')?.innerText.includes(n), `#${d.id.slice(0, 8).toUpperCase()}`), 'recherche globale (Ctrl K)');
  await p.keyboard.press('Escape');
  check(await p.evaluate(() => document.body.innerText.includes('Horodatage certifié le')), 'horodatage certifié affiché');

  await p.goto(`${WEB}/compte`, { waitUntil: 'networkidle0' });
  check(await attendre(p, () => document.body.innerText.includes('PN-4521')), 'page « Mon compte »');

  // --- assureur
  const q = await nouvellePage();
  await connexion(q, `ui.assur.${stamp}@test.local`, `Assur-${stamp}`);
  check(await attendre(q, (id) => !!document.querySelector(`a[href="/dossiers/${id}"]`), d.id), 'assureur : le dossier transmis apparaît');
  check(await q.evaluate(() => ![...document.querySelectorAll('aside a')].some((a) => /Statistiques|Comptes/.test(a.textContent))), 'assureur : pas de statistiques ni de comptes dans le menu');
  await sansScene(q);
  await q.goto(`${WEB}/dossiers/${d.id}`, { waitUntil: 'networkidle0' });
  await attendre(q, () => [...document.querySelectorAll('button')].some((x) => x.textContent.trim() === 'Exporter en PDF'));
  const boutons = await q.evaluate(() => [...document.querySelectorAll('button')].map((x) => x.textContent.trim()));
  check(boutons.includes('Exporter en PDF') && !boutons.includes('Valider le dossier') && !boutons.includes('Contester') && !boutons.includes('Témoignage'), 'assureur : lecture seule (export uniquement)');
  check(await q.evaluate(() => document.body.innerText.includes('Vérifier les freins du véhicule B.') && document.body.innerText.includes('le conducteur A a raison')), 'assureur : remarque et conclusion visibles');
  await q.goto(`${WEB}/statistiques`, { waitUntil: 'networkidle0' });
  await pause(1000);
  check(q.url().endsWith('/dossiers'), 'assureur : /statistiques redirige vers ses dossiers');
  await q.goto(`${WEB}/tableau-de-bord`, { waitUntil: 'networkidle0' });
  check(await attendre(q, () => location.pathname === '/dossiers'), 'assureur : pas de tableau de bord des autorités');

  // --- déconnexion
  await p.goto(`${WEB}/dossiers`, { waitUntil: 'networkidle0' });
  await cliquerTexte(p, 'Se déconnecter');
  await p.waitForSelector('[role=dialog]');
  await cliquerTexte(p, 'Oui, me déconnecter');
  await pause(1500);
  await p.goto(`${WEB}/dossiers`, { waitUntil: 'networkidle0' });
  await pause(1500);
  check(p.url().includes('/login'), 'après déconnexion, retour à la connexion');

  // 401 attendus : vérification de session sur la page de connexion et après déconnexion.
  const vraies = erreurs.filter((e) => !/40[13]/.test(e));
  check(vraies.length === 0, `aucune erreur JavaScript${vraies.length ? ' : ' + vraies.slice(0, 3).join(' | ') : ''}`);
  console.log(`\n${ok} OK, ${ko} échec(s)`);
  await b.close();
  process.exitCode = ko ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });

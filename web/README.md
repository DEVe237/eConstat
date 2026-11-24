# eConstat — Dashboard autorités et assureurs

Application web du cahier des charges §4 et §5.4. Les conducteurs, eux, utilisent l'application mobile.

| Rôle | Accès |
|---|---|
| **Agent** (police, gendarmerie) | Dossiers transmis : consultation, 3D, **valider / contester / compléter**, **témoignages**, **transmission à un assureur**, export PDF, statistiques |
| **Assureur** | En lecture seule, uniquement les dossiers transmis à **sa compagnie** : consultation, 3D, export PDF, preuve d'horodatage |
| **Administrateur** | Tout ce que fait un agent + gestion des comptes (agents, assureurs, administrateurs) |

## Écrans

- **Connexion** — refusée aux comptes conducteurs.
- **Dossiers** — onglets par statut, recherche (plaque, conducteur, n° #02EC6023), filtres par date et par zone ; le menu affiche le nombre de dossiers à traiter et une alerte apparaît à l'arrivée d'un nouveau dossier (vérification toutes les 30 s).
- **Détail** — reconstitution 3D (vidéo ou vue interactive), véhicules A/B, photos, vidéos, signatures, témoignages, empreinte d'intégrité et **horodatage certifié** (preuve `.tsr` téléchargeable), assureurs destinataires, historique complet.
- **Statistiques** — volumes, statuts, délais, carte des accidents et zones à risque, heures, météo, zones de choc.
- **Comptes** (administrateurs) — création, désactivation (effet immédiat), réinitialisation du mot de passe.
- **Mon compte** — informations et changement de mot de passe.

## Sécurité

- Session dans un **cookie httpOnly SameSite=Strict** : le jeton n'est jamais lisible par le JavaScript de la page.
- Le navigateur ne parle qu'à ce site : `/api/*` est relayé vers l'API par Next.js (`next.config.ts`).
- Photos, signatures et scène 3D ne sont servies que par **liens signés à durée limitée** (2 h).
- Un compte désactivé perd l'accès immédiatement ; un changement de rôle est pris en compte sans reconnexion.

## Développement

```bash
# Backend (../backend) : PostgreSQL, Redis, MinIO et worker 3D via Docker, puis l'API
docker compose up -d postgres redis minio worker
npm run start:dev                 # http://localhost:3000 — Swagger sur /docs

# Dashboard (ce dossier)
cp .env.local.example .env.local  # API_URL=http://localhost:3000
npm install
npm run dev                       # http://localhost:3001
```

Le premier administrateur est créé au démarrage de l'API à partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD` (`backend/.env`).

## Tests

Avec l'API et le dashboard démarrés, depuis `../backend` :

```bash
npm run test:dashboard   # API : sécurité, application mobile, dashboard, assureur (57 vérifications)
npm run test:ui          # interface dans un vrai navigateur : agent puis assureur (16 vérifications)
```

Ces tests créent des comptes et des dossiers de test : à lancer uniquement sur une base de développement.

## Production

Voir [../backend/DEPLOIEMENT.md](../backend/DEPLOIEMENT.md).

## Stack

Next.js 16 (App Router, sortie standalone) · React 19 · TypeScript · Tailwind CSS 4 · Recharts · Leaflet / OpenStreetMap.
La vue 3D interactive réutilise le module three.js du backend (`/simulation3d/scene.html`), le même que la WebView mobile.

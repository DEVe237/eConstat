# eConstat — déploiement en production

Tout tourne dans Docker sur un seul serveur : PostgreSQL, Redis, MinIO, l'API, le worker 3D,
le dashboard web et Caddy (HTTPS automatique).

```
Internet ──HTTPS──▶ Caddy ─┬─ DOMAINE_WEB ─▶ web (Next.js) ──/api──▶ api (NestJS)
                           └─ DOMAINE_API ─▶ api ◀── application mobile
                                              │
                         postgres · redis · minio · worker 3D
```

## 1. Prérequis

- Un serveur Linux avec Docker et Docker Compose, ports 80 et 443 ouverts.
- Deux noms de domaine pointant vers ce serveur (DNS A/AAAA), par exemple
  `dashboard.exemple.cm` et `api.exemple.cm`.

## 2. Configuration

```bash
cp .env.prod.example .env.prod
```

Remplacer **chaque** valeur `a-changer` dans `.env.prod`. En particulier :

- `JWT_SECRET` : longue valeur aléatoire. Elle signe les sessions et les liens de fichiers ; la changer
  déconnecte tout le monde.
- `DATABASE_PASSWORD` : utilisé à la fois par le conteneur PostgreSQL et par l'API.
- `TSA_URL` : autorité d'horodatage RFC 3161. Pour qu'un horodatage ait une valeur légale, choisir une
  autorité reconnue par la réglementation camerounaise. Vide = pas d'horodatage.

## 3. Démarrage

```bash
docker compose --env-file .env.prod --profile prod up -d --build
```

- Dashboard : `https://DOMAINE_WEB` — se connecter avec `ADMIN_EMAIL` / `ADMIN_PASSWORD`,
  puis **changer ce mot de passe** dans « Mon compte » et créer les comptes agents et assureurs.
- Documentation de l'API : `https://DOMAINE_API/docs`.
- Application mobile : `flutter build apk --release --dart-define=API_URL=https://DOMAINE_API`.

## 4. Sauvegardes

Les données vivent dans des volumes Docker :

| Volume | Contenu |
|---|---|
| `camaircost_pgdata` | Base de données (dossiers, comptes, historique) |
| `camaircost_uploads` | Photos, vidéos et signatures des constats |
| `camaircost_miniodata` | Vidéos de reconstitution 3D |

Sauvegarde quotidienne de la base, par exemple :

```bash
docker exec camaircost-postgres pg_dump -U camaircost camaircost | gzip > sauvegarde-$(date +%F).sql.gz
```

Les photos et signatures sont des pièces du dossier (leur empreinte entre dans l'empreinte d'intégrité) :
sauvegarder aussi `camaircost_uploads`.

## 5. Points d'attention avant d'ouvrir au public

- **Schéma de base de données** : l'API le synchronise automatiquement depuis le code (`synchronize: true`).
  C'est pratique en phase de conception, mais avant d'avoir des données réelles il faut passer à des
  migrations TypeORM pour maîtriser chaque modification.
- **Valeur légale** : la reconnaissance juridique du constat numérique et de la signature électronique
  dépend de la réglementation camerounaise (cahier des charges §9.1). Faire valider le format du PDF exporté
  et le choix de l'autorité d'horodatage avant usage officiel.
- **Mises à jour** : `docker compose --env-file .env.prod --profile prod up -d --build` reconstruit et
  redémarre les services modifiés.

## Railway (API seule)

Un seul service suffit : l'API lance elle-même le worker 3D et range les vidéos sur son volume
(pas de MinIO).

1. Créer un projet Railway, y ajouter **PostgreSQL** et **Redis**.
2. Ajouter un service depuis le dépôt GitHub, *Root Directory* = `/backend`.
3. Ajouter un **volume** monté sur `/app/uploads` : sans lui, photos et vidéos sont perdues à chaque déploiement.
4. Variables du service :

| Variable | Valeur |
|---|---|
| `RAILWAY_DOCKERFILE_PATH` | `Dockerfile.api` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `STOCKAGE_VIDEOS` | `local` |
| `WORKER_INTEGRE` | `true` |
| `JWT_SECRET` | 64 caractères aléatoires (obligatoire, l'API refuse de démarrer sinon) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | premier compte administrateur |
| `ANTHROPIC_API_KEY`, `IA_MODELE` | facultatif : analyse IA des photos (les deux ensemble) |
| `TSA_URL` | facultatif : autorité d'horodatage |

5. *Settings > Networking > Generate Domain*, puis construire l'app avec cette adresse (`--dart-define=API_URL=...`).

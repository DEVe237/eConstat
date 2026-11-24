# eConstat

Constat automobile numérique assisté par l'intelligence artificielle, avec reconstitution 3D de l'accident (Cameroun).

| Dossier | Contenu |
|---|---|
| `backend/` | API NestJS, worker 3D, analyse IA des photos (PostgreSQL, Redis) |
| `web/` | Dashboard des agents, assureurs et administrateurs (Next.js) |
| `mobile/` | Application des conducteurs (Flutter) : capture guidée, formulaire, signatures |

## Démarrer en développement

```bash
cd backend && docker compose up -d postgres redis minio && npm ci && npm run start:dev   # http://localhost:3000/docs
cd web && npm ci && npm run dev                                                          # http://localhost:3001
cd mobile && flutter run --dart-define=API_URL=http://localhost:3000
```

L'API lit `backend/.env` (modèle : `backend/.env.prod.example`). Déploiement : [backend/DEPLOIEMENT.md](backend/DEPLOIEMENT.md).

Tests : `npm run test:dashboard` et `npm run test:ui` dans `backend/`.

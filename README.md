# Photo Portfolio

Portfolio sur mesure pour photographe — Next.js 16 + Neon (Postgres) + Cloudflare R2.

## Stack

- **Next.js 16** — App Router, Server Components, `next/image` pour l'optimisation
- **TypeScript** + **Tailwind CSS v4**
- **Neon** — Postgres serverless (free tier)
- **Drizzle ORM** — requêtes type-safe
- **UploadThing** — stockage des photos (2 GB free, sans CB)
- **Auth.js v5** — authentification admin (credentials)
- **dnd-kit** — drag & drop dans l'admin

## Setup (étape par étape)

### 1. Variables d'environnement

```bash
cp .env.local.example .env.local
```

Puis remplis les valeurs (cf. sections suivantes).

Génère un secret Auth :
```bash
openssl rand -base64 32
```
Colle-le dans `AUTH_SECRET`.

### 2. Base de données — Neon

1. Crée un compte sur https://console.neon.tech (free tier)
2. Crée un projet (région la plus proche de toi)
3. Copie la `DATABASE_URL` (avec `?sslmode=require`) dans `.env.local`
4. Pousse le schéma :
   ```bash
   npm run db:push
   ```

### 3. Stockage des photos — UploadThing

1. Crée un compte sur https://uploadthing.com (login via GitHub, pas de CB)
2. Crée une nouvelle app dans le dashboard
3. Va dans **API Keys**, copie le `UPLOADTHING_TOKEN` (commence par `eyJ...`)
4. Colle-le dans `.env.local`

Free tier : 2 GB de stockage. Si tu dépasses, passe au plan payant (~10 $/mois pour 100 GB) ou migre vers R2 plus tard.

### 4. Créer le compte admin

```bash
# Remplis SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD dans .env.local
npm run seed:admin
```

### 5. Lancer le projet

```bash
npm run dev
```

Ouvre http://localhost:3000

- Site public : `/`
- Login admin : `/login`
- Panel admin : `/admin`

## Structure

```
src/
├── app/
│   ├── (public)/         # Pages publiques (gallery, about, contact)
│   ├── admin/            # Panel admin (protégé par middleware)
│   ├── api/              # Routes API (auth, photos, upload, stats)
│   ├── login/            # Page de login
│   └── page.tsx          # Homepage
├── components/
│   ├── ui/               # Composants UI réutilisables
│   ├── gallery/          # Composants de galerie
│   └── admin/            # Composants spécifiques admin
├── lib/
│   ├── db/               # Drizzle (schema + client)
│   ├── auth.ts                # Config Auth.js
│   ├── uploadthing.ts         # File router UploadThing (server)
│   ├── uploadthing-client.ts  # UploadButton/Dropzone (client)
│   └── utils.ts               # Helpers (cn)
└── middleware.ts         # Protection des routes /admin
```

## Tables (Drizzle schema)

- `users` — comptes admin
- `sections` — sections personnalisables (layout, couleurs)
- `photos` — photos + métadonnées d'affichage (taille, rotation, position)
- `links` — liens externes (Instagram, etc.)
- `site_settings` — config globale (JSON)
- `page_views` — stats de visite
- `interactions` — clics, hover sur photo, etc.

## Déploiement (Vercel)

1. Push sur GitHub
2. Importe le projet sur https://vercel.com/new
3. Renseigne les mêmes variables d'env que `.env.local`
4. Deploy

## Étapes suivantes

- [ ] Upload de photos (UI drag & drop avec `<UploadDropzone>`)
- [ ] Réorganisation des photos (dnd-kit)
- [ ] Éditeur visuel des sections
- [ ] Tracking automatique des vues (middleware ou client component)
- [ ] Graphiques de stats (recharts ou tremor)
- [ ] Gestion des liens externes (Instagram, etc.)

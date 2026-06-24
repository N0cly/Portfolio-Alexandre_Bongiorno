# Photo Portfolio

Portfolio sur mesure pour photographe — Next.js 16 + Neon (Postgres) + stockage local.

## Stack

- **Next.js 16** — App Router, Server Components, `next/image` pour l'optimisation
- **TypeScript** + **Tailwind CSS v4**
- **Neon** — Postgres serverless (free tier)
- **Drizzle ORM** — requêtes type-safe
- **Stockage local** — photos hébergées sur le serveur (quota 2 Go, jauge dans l'admin)
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

### 3. Stockage des photos — local (serveur)

Les photos sont écrites sur le disque du serveur (plus de service externe).

- Répertoire par défaut : `<racine>/uploads` (modifiable via `UPLOAD_DIR`).
- Quota par défaut : **2 Go** (modifiable via `PHOTO_STORAGE_LIMIT_BYTES`, en octets).
- Quand le quota est atteint : un avertissement s'affiche dans l'admin et les
  nouveaux uploads sont bloqués jusqu'à libération d'espace (suppression de photos).
- Une **jauge** de place restante est affichée sur la page d'ajout de photos
  (et dans l'uploader des galeries clients).

> ⚠️ Le répertoire `UPLOAD_DIR` doit être **persistant**. En conteneur, monte un
> volume dessus pour ne pas perdre les photos à chaque redéploiement.

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
│   ├── storage.ts             # Stockage local (disque) + quota (server)
│   ├── storage-types.ts       # Types/helpers partagés (client + server)
│   └── utils.ts               # Helpers (cn)
└── proxy.ts              # Protection des routes /admin
```

## Tables (Drizzle schema)

- `users` — comptes admin
- `sections` — sections personnalisables (layout, couleurs)
- `photos` — photos + métadonnées d'affichage (taille, rotation, position)
- `links` — liens externes (Instagram, etc.)
- `site_settings` — config globale (JSON)
- `page_views` — stats de visite
- `interactions` — clics, hover sur photo, etc.

## Déploiement

Le stockage local nécessite un serveur au **filesystem persistant** :

- ✅ VPS (`next start`), conteneur Docker avec un **volume** monté sur `UPLOAD_DIR`,
  plateformes type Railway/Render avec disque persistant.
- ❌ **Vercel** (et autres hébergements serverless) : filesystem éphémère/lecture
  seule → les fichiers uploadés seraient perdus. Non compatible avec ce stockage.

Exemple de montage Docker : `-v /data/portfolio/uploads:/app/uploads` avec
`UPLOAD_DIR=/app/uploads`.

## Étapes suivantes

- [ ] Upload de photos (UI drag & drop avec `<UploadDropzone>`)
- [ ] Réorganisation des photos (dnd-kit)
- [ ] Éditeur visuel des sections
- [ ] Tracking automatique des vues (middleware ou client component)
- [ ] Graphiques de stats (recharts ou tremor)
- [ ] Gestion des liens externes (Instagram, etc.)

# MICA
Mes indicateurs clés alimentaires

Saisie des repas (calories, protéines, glucides, lipides), objectifs calculés depuis le poids, calendrier coloré selon l'atteinte des objectifs.

PWA en HTML, CSS et JavaScript natifs, hébergée sur GitHub Pages. Données dans votre propre projet Supabase.

## Déployer sa propre instance

### 1. Forker le dépôt et activer GitHub Pages
1. **Fork** du dépôt sur GitHub.
2. Dans le fork : **Settings → Pages → Build and deployment**, source **Deploy from a branch**, branche `main`, dossier `/ (root)`, **Save**.
3. L'app est publiée sous `https://<utilisateur>.github.io/<dépôt>/`.

### 2. Créer un projet Supabase
1. Compte sur [supabase.com](https://supabase.com), offre gratuite.
2. **New project** : nom, mot de passe de base de données (non utilisé par Mica), région proche.

### 3. Créer les tables
**SQL Editor → New query**, coller [`sql/schema.sql`](sql/schema.sql), **Run**.

### 4. Créer son utilisateur
1. **Authentication → Users → Add user → Create new user** : email, mot de passe, cocher **Auto Confirm User**.
2. **Authentication → Sign In / Providers** : désactiver **Allow new users to sign up**.

### 5. Se connecter dans Mica
Ouvrir l'app, **Réglages → Connexion** :

| Champ | Où le trouver dans Supabase |
|---|---|
| URL du projet (`https://xxxx.supabase.co`) | **Project Settings → Data API** |
| Clé publishable (`sb_publishable_…`) | **Project Settings → API Keys** |
| Email et mot de passe | Utilisateur créé à l'étape 4 |

Le mot de passe n'est pas conservé sur l'appareil ; la session reste ouverte.

### 6. Ajouter l'app à l'écran d'accueil
Safari sur iPhone : **Partager → Sur l'écran d'accueil**.

## À savoir

- **Clé secret** : ne jamais utiliser la clé `sb_secret_…`, ni dans l'app ni dans le dépôt. Elle contourne la protection des données (RLS).
- **Offre gratuite Supabase** : un projet sans activité pendant une semaine est mis en pause. Les données sont conservées. Réactivation : tableau de bord Supabase → projet → **Restore project**.
- **Mise à jour du code** : après chaque déploiement, incrémenter `VERSION` dans [`sw.js`](sw.js) (`mica-v2` → `mica-v3`), sinon les appareils gardent l'ancienne version en cache.

## Licence

Voir [LICENSE](LICENSE).

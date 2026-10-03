# MICA
Moniteur d'indicateurs clés alimentaires

## Utiliser Mica avec son propre compte

Mica stocke les données dans **votre** projet Supabase (offre gratuite). Comptez environ 10 minutes.

### 1. Créer le projet Supabase
1. Créer un compte sur [supabase.com](https://supabase.com).
2. **New project** : choisir un nom, un mot de passe de base de données (il ne sert pas dans Mica) et une région proche. Attendre la fin de la création.

### 2. Créer les tables
1. Ouvrir **SQL Editor**, puis **New query**.
2. Coller le contenu de [`sql/schema.sql`](sql/schema.sql) et cliquer sur **Run**.

### 3. Créer son utilisateur
1. **Authentication → Users → Add user → Create new user**.
2. Saisir un email et un mot de passe, cocher **Auto Confirm User**, puis valider.
3. **Authentication → Sign In / Providers** : désactiver **Allow new users to sign up**, pour que personne d'autre ne puisse créer de compte.

### 4. Noter les identifiants
| Élément | Où le trouver | Format |
|---|---|---|
| URL du projet | **Project Settings → Data API** | `https://xxxx.supabase.co` |
| Clé publishable | **Project Settings → API Keys** | `sb_publishable_…` |
| Email et mot de passe | Ceux de l'étape 3 | — |

> N'utilisez jamais la clé `sb_secret_…` : elle contourne la protection des données.

### 5. Se connecter dans Mica
1. Ouvrir Mica : onglet **Réglages**, carte **Connexion**.
2. Saisir l'URL, la clé publishable, l'email et le mot de passe, puis **Se connecter**.

L'URL, la clé et l'email restent enregistrés sur l'appareil, mais le mot de passe ne l'est jamais. La session reste ouverte : il n'est pas nécessaire de se reconnecter à chaque ouverture.

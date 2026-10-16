# Comptes et progression serveur Brigo

Le compte utilise Supabase Auth (Google ou email/mot de passe), PostgreSQL et la fonction Edge `game`. La partie invitée garde ses anciens identifiants IndexedDB/localStorage. Un compte démarre une **nouvelle partie serveur**, sans importation ni fusion avec une partie locale. Le compte connecté exige Internet ; une réponse incertaine ne devient jamais un gain local.

Le déploiement GitHub Pages choisi pour ce premier lancement reste une **démo invitée**, sans configuration de comptes ni paiement ; voir [le déploiement Pages](github-pages.md). Les adresses `https://app.brigo.example/` ci-dessous sont des exemples à remplacer par le futur hébergement de l’application avec comptes.

## Préparer deux projets et les clés

Créer deux projets Supabase distincts, test et production, en **Central EU (Francfort, `eu-central-1`)**. Déployer d’abord sur test. La région de la base se choisit à la création ; les services et traitements annexes ont leurs propres conditions de résidence. Voir [les régions](https://supabase.com/docs/guides/platform/regions) et [la résidence des données](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq).

Créer une clé **publishable** destinée au navigateur et une clé **secret** pour le serveur. La fonction préfère les dictionnaires `SUPABASE_PUBLISHABLE_KEYS` et `SUPABASE_SECRET_KEYS` injectés par la plateforme (clé `default`). Elle accepte aussi les variables legacy `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` pour les anciennes stacks locales. La clé secret ne figure dans aucun `VITE_*`, dépôt ou bundle navigateur. Les nouvelles clés ne sont pas des JWT ; l’adaptateur serveur utilise leur en-tête `apikey`. Voir [les clés](https://supabase.com/docs/guides/getting-started/api-keys) et [les secrets injectés](https://supabase.com/docs/guides/functions/secrets).

Dans `.env.local` du frontend, définir les variables publiques de `.env.example` : URL du projet, clé publishable et URL de retour du compte. La partie invitée fonctionne aussi sans projet configuré.

Dans les secrets de la fonction, définir **`BRIGO_ALLOWED_ORIGINS`**, liste d’origines exactes séparées par une virgule, sans chemin ni `/` final. Exemple du futur hébergement : `https://app.brigo.example`. Exemple test local : `http://127.0.0.1:5173,http://localhost:5173`. Aucune origine `*` n’est acceptée ; une liste absente ferme le service. Les requêtes non navigateur restent authentifiées avec un jeton utilisateur.

## Auth, Google et emails Resend

Dans Authentication / URL Configuration, configurer :

| Environnement           | Site URL                              | URL de retour autorisée                       |
| ----------------------- | ------------------------------------- | --------------------------------------------- |
| Local                   | `http://127.0.0.1:5173/`              | `http://127.0.0.1:5173/#account`              |
| Futur hébergement des comptes | `https://app.brigo.example/` | `https://app.brigo.example/#account` |

Ajouter les origines de test réellement utilisées, sans joker global en production. Si l’application est hébergée dans un sous-chemin, le retour d’authentification doit le conserver avant `#account`. Voir [les redirections](https://supabase.com/docs/guides/auth/redirect-urls).

Activer les inscriptions email, **Confirm email**, le changement d’email avec double confirmation et le changement de mot de passe sécurisé ; minimum **12 caractères**. Le serveur refuse les comptes anonymes et les sessions sans email confirmé. Le client utilise le flux PKCE et Supabase gère les mots de passe ; PostgreSQL Brigo ne les stocke jamais.

Conserver les liens de vérification Supabase `{{ .ConfirmationURL }}` dans les modèles d’email : Supabase vérifie le jeton puis renvoie un code PKCE sur l’URL autorisée. La confirmation et la récupération doivent être ouvertes dans le **même navigateur et appareil** que la demande, car le vérificateur PKCE y est enregistré. Une ouverture ailleurs ou un lien expiré exige de recommencer la demande depuis ce navigateur ; ne pas remplacer ce parcours par une acceptation de jetons ou d’identités fournis directement par l’utilisateur. Vérifier le retour `?code=…#account`, l’ouverture du compte et le formulaire de nouveau mot de passe pour une récupération. Voir [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow) et [les modèles d’email](https://supabase.com/docs/guides/auth/auth-email-templates).

Créer un client OAuth web dans Google Cloud, configurer l’écran de consentement et les origines JavaScript du site. Dans Google, autoriser l’URI de rappel **Supabase**, `https://<project-ref>.supabase.co/auth/v1/callback`, puis renseigner client ID et secret dans le provider Google du dashboard Supabase. Le secret Google reste dans Supabase. Publier le consentement pour sortir des seuls comptes de test. Voir [Google avec Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google).

Pour les emails réels, activer Custom SMTP avec **Resend** : domaine d’expédition possédé et vérifié, enregistrements DNS fournis par Resend, expéditeur `Brigo <comptes@votre-domaine>`, hôte `smtp.resend.com`, port `465`, utilisateur `resend`, mot de passe = clé API Resend. Garder les clés SMTP hors du frontend. Désactiver le suivi des liens des emails d’authentification et vérifier confirmation/récupération sur téléphone. Le domaine reste à fournir ; GitHub Pages seul ne fournit pas de domaine d’envoi. Voir [Resend SMTP pour Supabase](https://resend.com/docs/send-with-supabase-smtp) et [les limites SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

## Déploiement

Installer le CLI Supabase selon sa documentation, puis, pour **chaque projet** :

```text
supabase login
supabase link --project-ref <reference-du-projet>
supabase db push
npm run server:bundle
supabase secrets set BRIGO_ALLOWED_ORIGINS=https://app.brigo.example
supabase functions deploy game
```

`npm run server:bundle` construit `supabase/functions/game/generated/server.js` depuis le même moteur et les mêmes commandes typées que l’application. Ce fichier est généré et ignoré par Git ; il faut le reconstruire **avant chaque déploiement** de la fonction. Aucun import Node ou React n’entre dans le runtime Deno. Le serveur n’accepte ni import de partie, ni solde, ni tirage fourni par le navigateur, ni commande admin.

La configuration `verify_jwt = false` permet les clés de signature modernes et les requêtes OPTIONS. Cela **ne rend pas l’API publique** : hors OPTIONS, le handler vérifie systématiquement le bearer auprès de `Auth /auth/v1/user`, puis déduit exclusivement son utilisateur de cette réponse. Une simple lecture locale du contenu du JWT ne suffit pas. Les RPC SQL exigent `service_role` et ne sont jamais appelables avec les droits du joueur. [Sécuriser les fonctions](https://supabase.com/docs/guides/functions/auth), [protéger les données](https://supabase.com/docs/guides/database/secure-data).

En local, `supabase start`, puis créer `supabase/functions/.env` ignoré avec les origines locales, exécuter `supabase db reset` **uniquement sur la stack locale jetable**, reconstruire le bundle et lancer `supabase functions serve game`. Les identifiants locaux sont fournis par le CLI. Avec confirmation activée, les emails locaux se consultent dans la boîte de test de la stack Supabase.

## API et garanties de stockage

Endpoint : `https://<project-ref>.supabase.co/functions/v1/game`.

- `GET`, avec bearer utilisateur, retourne `{state, revision, serverTime}`. La création du compte de jeu est atomique et unique. Les 1 200 pièces et trois boîtes de départ ont un reçu et une ligne d’origine dans le journal à la révision **0**.
- `POST` JSON : `{commandId, expectedRevision, command}`. `commandId` est un UUID neuf pour chaque intention et reste le même pour un nouvel essai réseau de **la même commande et révision**. Les commandes publiques sont celles de `src/game/commands.ts`.
- Succès : `{state, revision, serverTime, result, replayed}`. La réponse confirmée fournit l’heure serveur. Le moteur calcule récompenses, réservations, horloges et aléatoire cryptographique, puis le validateur de sauvegarde vérifie l’état calculé avant écriture.
- `409 REVISION_CONFLICT` : `{error, snapshot}` ; recharger le snapshot fourni, expliquer le conflit, puis une nouvelle intention reçoit un nouvel UUID. Aucun écrasement silencieux ni rejeu automatique d’une dépense.
- Un reçu connu avec la même empreinte retourne le **résultat original et l’état courant**. Une empreinte différente avec le même UUID produit `409 COMMAND_ID_REUSED`, jamais une deuxième exécution.
- Autres erreurs : `400` entrée incorrecte, `401` session absente/non confirmée/expirée, `403` origine refusée, `413` corps trop volumineux, `415` JSON requis, `422` règle du jeu, `429` limite atteinte, `503` indisponibilité. Aucune réponse d’erreur ne contient de secret ni diagnostic SQL.

Le corps est limité à **16 Kio**, l’état à **3 Mo**, les requêtes à **120 par minute et par compte** (compteur en base, non partagé avec les autres comptes). Les récompenses restent bornées par les règles métier, indépendamment de ce limiteur. Surveiller également les limites Auth et SMTP et activer les protections anti-abus Auth de la plateforme avant une ouverture publique large.

Tables : `brigo_profiles` (UUID, pseudo facultatif borné), `brigo_games` (JSONB versionné et révision), `brigo_command_receipts` (unicité compte + UUID + empreinte), `brigo_economic_ledger` (commande, deltas et soldes) et compteur de requêtes privé. Le pseudo se synchronise depuis les métadonnées Auth, sans leur attribuer de pouvoir sur l’économie. Toutes les tables ont RLS ; le joueur lit uniquement ses propres données et ne peut écrire dans aucune table de jeu.

Le commit verrouille la ligne de partie, recherche le reçu **après** le verrou, contrôle la révision attendue et écrit état + reçu + journal dans la même transaction. Une erreur annule l’ensemble. Un double clic, deux appareils ou une réponse perdue après commit ne dépensent/créditent jamais deux fois. Les migrations des anciennes parties serveur passent par le moteur existant, avec commit CAS et journal privé ; les clés invitées historiques restent inchangées.

Les reçus et le journal ne sont pas purgés automatiquement : cela préserve l’idempotence. Surveiller leur croissance et définir une politique d’archivage qui conserve les identifiants de commandes avant d’en réduire la rétention. La suppression du compte Auth entraîne la suppression de ses lignes Brigo ; aucun parcours de suppression de compte n’est ajouté dans ce lot.

## Vérifier et exploiter

```text
npm test
npm run check
npm run build
npm run server:bundle
```

Les tests `src/server` exécutent la **vraie migration SQL dans PostgreSQL PGlite**, avec rôles `anon`, `authenticated`, `service_role` et `auth.uid()`. Ils couvrent isolation RLS, refus des écritures/RPC clientes, initialisation unique tracée, reçus, concurrence de révisions et rollback du journal. Les tests du handler couvrent origine, jeton, requêtes forgées, limites, migrations, tirage rejoué, conflit et réponse perdue. Les tests métier couvrent les réservations et récompenses.

Pour vérifier les verrous avec de vraies connexions concurrentes, sur une **base de test isolée déjà migrée**, installer `psql`, fournir `BRIGO_TEST_DATABASE_URL`, définir `BRIGO_RUN_DATABASE_TESTS=1`, puis :

```text
node scripts/test-server-postgres.mjs
```

Le script crée un seul utilisateur de test aléatoire puis le supprime avec ses lignes ; il ne migre aucune base et ne doit pas viser la production. PGlite ne simule pas plusieurs connexions réseau ; ce test complète la vérification avant mise en service.

Sur test, faire les parcours réels : inscription, lien de confirmation, connexion Google, oubli/changement de mot de passe, connexion d’un autre compte, reconnexion au compte initial, séparation partie locale/serveur, coupure après action, reprise, deux appareils et ouverture en attente. Contrôler desktop, mobile 320/390 px, clavier, contrastes et réduction des animations. Les tests locaux ne remplacent pas ces validations du provider réel.

Surveiller les erreurs `GAME_SERVICE_FAILURE`, le taux de 401/409/429/503, la latence, la croissance du journal et les quotas base/egress/Edge/SMTP, sans journaliser jetons, mots de passe, emails ou corps de requêtes. Un 409 isolé est une concurrence normale ; des échecs répétés demandent une inspection. Ne pas exposer le journal SQL au public.

## Avant les premiers paiements

Le développement peut commencer avec **Free**. Avant les premiers paiements, activer **Pro**, vérifier les quotas et coûts réellement en vigueur, configurer les alertes et le contrôle de dépense. Free peut être mis en pause et ne constitue pas une stratégie de sauvegarde de production. Voir [les tarifs](https://supabase.com/pricing) et [les sauvegardes](https://supabase.com/docs/guides/platform/backups).

Définir une fréquence de sauvegarde/export chiffré et une durée de rétention, puis **tester une restauration dans un projet de test** : utilisateurs Auth, parties, reçus, journal, révisions et ressources réservées doivent correspondre au point restauré. Après restauration, comparer comptes et sommes du journal aux parties, confirmer les politiques RLS et tester une commande sans rejouer un ancien gain. Définir la perte de données tolérable et le temps de remise en service ; la restauration n’a pas été effectuée sans projet Supabase.

Les paiements sont un lot distinct. Réserver une table de paiements avec identifiant prestataire unique, montant/devise/produit vérifiés, événements signés côté serveur, crédit en transaction unique et rapprochement/remboursement auditable. Après restauration, rejouer les événements confirmés du prestataire depuis le dernier point cohérent en conservant leur unicité. La page de retour et le navigateur ne créditent jamais le joueur. Aucun prestataire ni paiement actif n’est intégré ici.

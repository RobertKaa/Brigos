# Comptes et progression serveur Brigos

Le compte utilise Supabase Auth (Google ou email/mot de passe), PostgreSQL et la fonction Edge `game`. La partie invitée garde ses anciens identifiants IndexedDB/localStorage. Un compte démarre une **nouvelle partie serveur**, sans importation ni fusion avec une partie locale. Le compte connecté exige Internet ; une réponse incertaine ne devient jamais un gain local.

Le frontend local est relié au projet Brigos par `.env.local`, fichier ignoré par Git qui contient uniquement les paramètres publics du client. L’inscription, la connexion, le renvoi de confirmation et la récupération du mot de passe sont implémentés. GitHub Pages reste une **démo invitée**, sans compte connecté ni paiement ; voir [le déploiement Pages](github-pages.md). La publication avec comptes sur Cloudflare et son automatisation depuis `main` sont autorisées ; suivre [l’état du déploiement et du domaine](cloudflare.md).

## Projet Brigos actuel

La base Brigos est installée dans le [projet Supabase créé pour Brigos](https://supabase.com/dashboard/project/zqhnbygwxfqjtbfeuiyg). État vérifié le **16 octobre 2026** :

| Paramètre | Valeur |
| --- | --- |
| Référence du projet | `zqhnbygwxfqjtbfeuiyg` |
| URL publique de l’API | `https://zqhnbygwxfqjtbfeuiyg.supabase.co` |
| Région observée | Francfort, `eu-central-1` |
| Fonction de jeu | `https://zqhnbygwxfqjtbfeuiyg.supabase.co/functions/v1/game` |

La migration `202610160001_brigo_accounts.sql` a été installée dans le SQL Editor du dashboard, dans une transaction. L’historique `supabase_migrations.schema_migrations` a ensuite été créé selon le [DDL officiel de la CLI](https://github.com/supabase/cli/blob/develop/apps/cli/src/command-internal/migration-history.ts) : version `202610160001`, nom `brigo_accounts`, script complet de 10 061 caractères enregistré comme texte, sans réexécuter la migration. Les prochains déploiements CLI doivent retrouver cette version déjà appliquée.

L’audit SQL distant confirme les cinq tables avec RLS, quatre politiques de lecture du propriétaire, aucun droit `anon`/`PUBLIC`, aucune écriture du joueur, quatre droits SELECT du joueur, les deux RPC économiques réservées à `service_role` et le trigger de profil Auth actif.

La fonction `game` est déployée depuis le dashboard à partir du bundle esbuild de l’entrypoint du dépôt. La vérification JWT de la passerelle est désactivée conformément à `config.toml` ; le handler vérifie lui-même les sessions auprès d’Auth. Le secret `BRIGO_ALLOWED_ORIGINS` contient `http://127.0.0.1:5173,http://localhost:5173`. Les contrôles HTTP distants passent : `401` sans session, `401` avec un faux bearer, `204` pour le preflight local et `403` pour une origine externe.

Auth exige la confirmation de l’email, désactive les comptes anonymes et active le changement d’email avec double confirmation. Le minimum de longueur réglé à 12 et le changement de mot de passe sécurisé sont enregistrés. Le Site URL est `http://127.0.0.1:5173/` et les deux retours autorisés sont `http://127.0.0.1:5173/#account` et `http://localhost:5173/#account`. Google reste désactivé et masqué dans le client (`VITE_AUTH_GOOGLE_ENABLED=false`, valeur par défaut).

Le domaine `brigoslab.com` est détenu depuis le **17 octobre 2026**, avec DNS chez OVH. Le sous-domaine d’envoi `auth.brigoslab.com` est vérifié dans Resend, en Irlande (`eu-west-1`). Le SMTP personnalisé est enregistré et actif dans Supabase, avec l’expéditeur prévu `Brigos <comptes@auth.brigoslab.com>`, après saisie de la clé directement par l’utilisateur. Les réglages sont conservés après rechargement. L’utilisateur confirme un essai réussi d’inscription, réception du mail, validation de l’adresse et connexion. Voir [les paramètres DNS et SMTP](email-delivery.md). Le SMTP personnalisé remplace le service de test Supabase limité aux membres de l’organisation ; ses propres quotas et les limites Auth continuent de s’appliquer. Voir [les limites SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

Une erreur `over_email_send_rate_limit` reçoit un message spécifique d’envoi temporairement limité, sans promettre un déblocage dans quelques minutes. Elle reste un échec pour l’inscription, le renvoi de confirmation et la récupération. L’erreur d’adresse non autorisée explique la restriction de l’environnement de test ; les détails bruts du fournisseur ne sont jamais affichés. Le scénario `email-limit` de `scripts/review-account.html` permet de vérifier ce message sans envoyer d’email.

Le CLI local n’est pas lié au projet : aucune authentification CLI par jeton personnel n’a été fournie. Cela n’empêche pas la base et la fonction d’être installées via le dashboard. La clé publishable du frontend local ne confère aucun droit administrateur et n’est pas recopiée dans cette documentation ; `.env.example` conserve une valeur vide. Les parcours de confirmation et récupération par email réel restent à valider par l’utilisateur, qui saisit lui-même son mot de passe.

## Préparer les environnements et les clés

Avant l’ouverture publique des comptes, séparer test et production dans deux projets Supabase distincts, en **Central EU (Francfort, `eu-central-1`)**. Déployer d’abord sur test. La région de la base se choisit à la création ; les services et traitements annexes ont leurs propres conditions de résidence. Voir [les régions](https://supabase.com/docs/guides/platform/regions) et [la résidence des données](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq).

Créer une clé **publishable** destinée au navigateur et une clé **secret** pour le serveur. La fonction préfère les dictionnaires `SUPABASE_PUBLISHABLE_KEYS` et `SUPABASE_SECRET_KEYS` injectés par la plateforme (clé `default`). Elle accepte aussi les variables legacy `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` pour les anciennes stacks locales. La clé secret ne figure dans aucun `VITE_*`, dépôt ou bundle navigateur. Les nouvelles clés ne sont pas des JWT ; l’adaptateur serveur utilise leur en-tête `apikey`. Voir [les clés](https://supabase.com/docs/guides/getting-started/api-keys) et [les secrets injectés](https://supabase.com/docs/guides/functions/secrets).

Dans `.env.local` du frontend, définir les variables publiques de `.env.example` : URL du projet, clé publishable et URL de retour du compte. Ce fichier est ignoré par Git et ne doit contenir aucune clé secret/service_role. La partie invitée fonctionne aussi sans projet configuré. Garder `VITE_AUTH_GOOGLE_ENABLED=false` tant que le fournisseur Google n’est pas configuré et vérifié ; passer la valeur à `true` seulement pour afficher son bouton sur l’hébergement concerné.

Dans les secrets de la fonction, définir **`BRIGO_ALLOWED_ORIGINS`**, liste d’origines exactes séparées par une virgule, sans chemin ni `/` final. Exemple du futur hébergement : `https://app.brigo.example`. Exemple test local : `http://127.0.0.1:5173,http://localhost:5173`. Aucune origine `*` n’est acceptée ; une liste absente ferme le service. Les requêtes non navigateur restent authentifiées avec un jeton utilisateur.

## Auth, Google et emails Resend

Dans Authentication / URL Configuration, configurer :

| Environnement           | Site URL                              | URL de retour autorisée                       |
| ----------------------- | ------------------------------------- | --------------------------------------------- |
| Local                   | `http://127.0.0.1:5173/`              | `http://127.0.0.1:5173/#account`              |
| Futur hébergement des comptes | `https://app.brigo.example/` | `https://app.brigo.example/#account` |

Ajouter les origines de test réellement utilisées, sans joker global en production. Si l’application est hébergée dans un sous-chemin, le retour d’authentification doit le conserver avant `#account`. Voir [les redirections](https://supabase.com/docs/guides/auth/redirect-urls).

Activer les inscriptions email, **Confirm email**, le changement d’email avec double confirmation et le changement de mot de passe sécurisé ; minimum de longueur réglé à **12**. Le serveur refuse les comptes anonymes et les sessions sans email confirmé. Le client utilise le flux PKCE ; l’inscription seule ne donne pas accès à la partie serveur. L’interface permet de renvoyer le lien de confirmation puis de se connecter après vérification.

Supabase Auth stocke un **hachage bcrypt avec un sel aléatoire**, jamais le mot de passe en clair. Les tables Brigos ne stockent aucun mot de passe ni hachage ; le hachage reste dans `auth.users.encrypted_password`. Un administrateur disposant de l’accès SQL au schéma Auth peut lire ce hachage, ce qui ne permet pas de récupérer directement le mot de passe. Ne jamais exposer le schéma Auth, une clé secret/service_role ou des journaux de mots de passe au navigateur. Voir [la sécurité des mots de passe](https://supabase.com/docs/guides/auth/password-security).

La version Auth observée, **v2.197.0**, refuse un mot de passe dépassant **72 octets UTF-8** : sa validation compare `len(password)` à 72 et son implémentation passe les octets directement à bcrypt, sans préhachage. La création et le nouveau mot de passe demandent au moins **12 points de code Unicode** dans le client et respectent ce plafond de 72 octets. Les accents et emojis occupent plusieurs octets ; une limite de 72 caractères HTML ne suffit pas. Refuser une valeur trop longue avec une explication, sans la tronquer, retirer ses espaces ou la normaliser. Ne pas réappliquer le minimum de création à la connexion des comptes existants. Voir [la validation Auth v2.197.0](https://github.com/supabase/auth/blob/v2.197.0/internal/api/password.go), [le hachage de cette version](https://github.com/supabase/auth/blob/v2.197.0/internal/crypto/password.go) et [la limite bcrypt](https://pkg.go.dev/golang.org/x/crypto/bcrypt#GenerateFromPassword).

Conserver les liens de vérification Supabase `{{ .ConfirmationURL }}` dans les modèles d’email : Supabase vérifie le jeton puis renvoie un code PKCE sur l’URL autorisée. La confirmation et la récupération doivent être ouvertes dans le **même navigateur et appareil** que la demande, car le vérificateur PKCE y est enregistré. Une ouverture ailleurs ou un lien expiré exige de recommencer la demande depuis ce navigateur ; ne pas remplacer ce parcours par une acceptation de jetons ou d’identités fournis directement par l’utilisateur. Vérifier le retour `?code=…#account`, l’ouverture du compte et le formulaire de nouveau mot de passe pour une récupération. Voir [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow) et [les modèles d’email](https://supabase.com/docs/guides/auth/auth-email-templates).

Le client observe aussi les erreurs d’initialisation du SDK pour expliquer un lien expiré ou non vérifiable, sans afficher les détails du fournisseur. Une réponse tardive ne remplace pas une connexion ou déconnexion plus récente. L’URL de retour configurée est utilisée uniquement si elle conserve l’origine de la page : une demande sur `localhost` ne revient pas vers `127.0.0.1`, où le vérificateur PKCE ne serait pas disponible. Chaque origine employée doit conserver sa propre redirection autorisée dans Supabase.

Pour activer Google ultérieurement, créer un client OAuth web dans Google Cloud, configurer l’écran de consentement et les origines JavaScript du site. Dans Google, autoriser l’URI de rappel **Supabase**, `https://<project-ref>.supabase.co/auth/v1/callback`, puis renseigner client ID et secret dans le provider Google du dashboard Supabase. Le secret Google reste dans Supabase. Publier le consentement pour sortir des seuls comptes de test, puis activer `VITE_AUTH_GOOGLE_ENABLED=true` après vérification. Voir [Google avec Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google).

Pour les emails réels, activer Custom SMTP avec **Resend** après vérification du domaine d’envoi prévu `auth.brigoslab.com`. L’expéditeur prévu est `Brigos <comptes@auth.brigoslab.com>`, l’hôte `smtp.resend.com`, le port `465`, l’utilisateur `resend` et le mot de passe une clé Resend dédiée à l’envoi sur ce domaine. Garder cette clé dans Supabase, hors du frontend et du dépôt. Suivre [la procédure DNS et SMTP](email-delivery.md), désactiver le suivi des liens et vérifier confirmation/récupération sur téléphone. Conserver l’offre gratuite et vérifier les quotas affichés dans Resend avant l’ouverture. Voir [Resend SMTP pour Supabase](https://resend.com/docs/send-with-supabase-smtp), [le domaine requis](https://resend.com/docs/dashboard/domains/introduction), [les tarifs Resend](https://resend.com/pricing) et [les limites SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

**Cloudflare Pages** est retenu pour le frontend avec comptes, avec une construction et une publication automatiques depuis `main`. Suivre [la configuration et la mise en service Cloudflare](cloudflare.md), puis remplacer les exemples `app.brigo.example` ci-dessus par le domaine final lors de sa mise en service. GitHub Pages reste la démo invitée jusqu’à sa désactivation par l’utilisateur. Les [ressources statiques Cloudflare Pages](https://developers.cloudflare.com/pages/functions/pricing/) sont gratuites ; le moteur et les données restent dans Supabase.

## Déploiement

La base et la fonction actuelles ont été installées via le dashboard. Pour les prochaines mises à jour par CLI, installer le CLI Supabase selon sa documentation, s’authentifier, puis lier le projet Brigos et vérifier l’historique :

```text
supabase login
supabase link --project-ref zqhnbygwxfqjtbfeuiyg
supabase migration list --linked
```

La migration initiale est déjà appliquée et enregistrée dans l’historique distant. Vérifier que la liste affiche `202610160001` localement et à distance avant d’utiliser `db push` ; ne pas la rejouer manuellement. Les mises à jour suivantes ciblent le projet lié ; les secrets et la fonction peuvent aussi nommer explicitement sa référence :

```text
supabase db push
npm run server:bundle
supabase secrets set BRIGO_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 --project-ref zqhnbygwxfqjtbfeuiyg
supabase functions deploy game --project-ref zqhnbygwxfqjtbfeuiyg
```

Les origines locales ci-dessus préparent les essais du backend sans activer les comptes sur GitHub Pages. Remplacer les origines lors du choix de l’hébergement des comptes. Pour le second projet, employer sa propre référence et ses propres réglages.

`npm run server:bundle` construit `supabase/functions/game/generated/server.js` depuis le même moteur et les mêmes commandes typées que l’application. Ce fichier est généré et ignoré par Git ; il faut le reconstruire **avant chaque déploiement** de la fonction. Aucun import Node ou React n’entre dans le runtime Deno. Le serveur n’accepte ni import de partie, ni solde, ni tirage fourni par le navigateur, ni commande admin.

La configuration `verify_jwt = false` permet les clés de signature modernes et les requêtes OPTIONS. Cela **ne rend pas l’API publique** : hors OPTIONS, le handler vérifie systématiquement le bearer auprès de `Auth /auth/v1/user`, puis déduit exclusivement son utilisateur de cette réponse. Une simple lecture locale du contenu du JWT ne suffit pas. Les RPC SQL exigent `service_role` et ne sont jamais appelables avec les droits du joueur. [Sécuriser les fonctions](https://supabase.com/docs/guides/functions/auth), [protéger les données](https://supabase.com/docs/guides/database/secure-data).

En local, `supabase start`, puis créer `supabase/functions/.env` ignoré avec les origines locales, exécuter `supabase db reset` **uniquement sur la stack locale jetable**, reconstruire le bundle et lancer `supabase functions serve game`. Les identifiants locaux sont fournis par le CLI. Avec confirmation activée, les emails locaux se consultent dans la boîte de test de la stack Supabase.

## API et garanties de stockage

La communauté utilise une RPC PostgreSQL distincte et des projections volontairement publiées, sans ouvrir la lecture des parties. La migration `202610180001_brigo_community` est appliquée depuis le 18 octobre 2026. Ses limites, ses contrôles RLS, sa vérification serveur et la procédure de modération sont décrits dans [Galeries et profils de joueurs](community.md). Publier l’interface v11 avant la mise à jour du moteur de jeu v11.

Endpoint du projet Brigos : `https://zqhnbygwxfqjtbfeuiyg.supabase.co/functions/v1/game`.

- `GET`, avec bearer utilisateur, retourne `{state, revision, serverTime}`. La création du compte de jeu est atomique et unique. Les 1 200 pièces et trois boîtes de départ ont un reçu et une ligne d’origine dans le journal à la révision **0**.
- `POST` JSON : `{commandId, expectedRevision, command}`. `commandId` est un UUID neuf pour chaque intention et reste le même pour un nouvel essai réseau de **la même commande et révision**. Les commandes publiques sont celles de `src/game/commands.ts`.
- Succès : `{state, revision, serverTime, result, replayed}`. La réponse confirmée fournit l’heure serveur. Le moteur calcule récompenses, réservations, horloges et aléatoire cryptographique, puis le validateur de sauvegarde vérifie l’état calculé avant écriture.
- `409 REVISION_CONFLICT` : `{error, snapshot}` ; recharger le snapshot fourni, expliquer le conflit, puis une nouvelle intention reçoit un nouvel UUID. Aucun écrasement silencieux ni rejeu automatique d’une dépense.
- Un reçu connu avec la même empreinte retourne le **résultat original et l’état courant**. Une empreinte différente avec le même UUID produit `409 COMMAND_ID_REUSED`, jamais une deuxième exécution.
- Autres erreurs : `400` entrée incorrecte, `401` session absente/non confirmée/expirée, `403` origine refusée, `413` corps trop volumineux, `415` JSON requis, `422` règle du jeu, `429` limite atteinte, `503` indisponibilité. Aucune réponse d’erreur ne contient de secret ni diagnostic SQL.

Le corps est limité à **16 Kio**, l’état à **3 Mo**, les requêtes à **120 par minute et par compte** (compteur en base, non partagé avec les autres comptes). Les récompenses restent bornées par les règles métier, indépendamment de ce limiteur. Surveiller également les limites Auth et SMTP et activer les protections anti-abus Auth de la plateforme avant une ouverture publique large.

Tables : `brigo_profiles` (UUID, pseudo facultatif borné), `brigo_games` (JSONB versionné et révision), `brigo_command_receipts` (unicité compte + UUID + empreinte), `brigo_economic_ledger` (commande, deltas et soldes) et compteur de requêtes privé. Le pseudo se synchronise depuis les métadonnées Auth, sans leur attribuer de pouvoir sur l’économie. Toutes les tables ont RLS ; le joueur lit uniquement ses propres données et ne peut écrire dans aucune table de jeu.

Le commit verrouille la ligne de partie, recherche le reçu **après** le verrou, contrôle la révision attendue et écrit état + reçu + journal dans la même transaction. Une erreur annule l’ensemble. Un double clic, deux appareils ou une réponse perdue après commit ne dépensent/créditent jamais deux fois. Les migrations des anciennes parties serveur passent par le moteur existant, avec commit CAS et journal privé ; les clés invitées historiques restent inchangées.

Les reçus et le journal ne sont pas purgés automatiquement : cela préserve l’idempotence. Surveiller leur croissance et définir une politique d’archivage qui conserve les identifiants de commandes avant d’en réduire la rétention. La suppression du compte Auth entraîne la suppression de ses lignes Brigos ; aucun parcours de suppression de compte n’est ajouté dans ce lot.

## Vérifier et exploiter

```text
npm test
npm run check
npm run build
npm run server:bundle
```

Les tests `src/server` exécutent la **vraie migration SQL dans PostgreSQL PGlite**, avec rôles `anon`, `authenticated`, `service_role` et `auth.uid()`. Ils couvrent isolation RLS, refus des écritures/RPC clientes, initialisation unique tracée, reçus, concurrence de révisions et rollback du journal. Les tests du handler couvrent origine, jeton, requêtes forgées, limites, migrations, tirage rejoué, conflit et réponse perdue. Les tests métier couvrent les réservations et récompenses.

La vérification du 16 octobre 2026 valide **2 336 tests**, `npm run check`, `npm run build` et `npm run server:bundle`, sans vulnérabilité de dépendance de production signalée par `npm audit --omit=dev`. Les formulaires sont vérifiés sur ordinateur et à 320/390 px, en thèmes clair et sombre, avec retour du focus clavier et animations réduites. Le build de démo ne propose aucun admin, même avec l’ancien paramètre d’activation forcé ; l’admin de développement exige une origine loopback et une partie invitée. Les contrôles distants décrits plus haut valident l’installation et les refus d’accès ; les parcours avec un compte authentifié et de vrais emails restent à tester.

Pour vérifier les verrous avec de vraies connexions concurrentes, sur une **base de test isolée déjà migrée**, installer `psql`, fournir `BRIGO_TEST_DATABASE_URL`, définir `BRIGO_RUN_DATABASE_TESTS=1`, puis :

```text
node scripts/test-server-postgres.mjs
```

Le script crée un seul utilisateur de test aléatoire puis le supprime avec ses lignes ; il ne migre aucune base et ne doit pas viser la production. PGlite ne simule pas plusieurs connexions réseau ; ce test complète la vérification avant mise en service.

Sur test, faire les parcours réels : inscription, lien de confirmation, connexion Google, oubli/changement de mot de passe, connexion d’un autre compte, reconnexion au compte initial, séparation partie locale/serveur, coupure après action, reprise, deux appareils et ouverture en attente. Contrôler desktop, mobile 320/390 px, clavier, contrastes et réduction des animations. Les tests locaux ne remplacent pas ces validations du provider réel.

Surveiller les erreurs `GAME_SERVICE_FAILURE`, le taux de 401/409/429/503, la latence, la croissance du journal et les quotas base/egress/Edge/SMTP, sans journaliser jetons, mots de passe, emails ou corps de requêtes. Un 409 isolé est une concurrence normale ; des échecs répétés demandent une inspection. Ne pas exposer le journal SQL au public.

## Avant les premiers paiements

Le développement peut commencer avec **Free**. Avant les premiers paiements, activer **Pro**, vérifier les quotas et coûts réellement en vigueur, configurer les alertes et le contrôle de dépense. Free peut être mis en pause et ne constitue pas une stratégie de sauvegarde de production. Voir [les tarifs](https://supabase.com/pricing) et [les sauvegardes](https://supabase.com/docs/guides/platform/backups).

Définir une fréquence de sauvegarde/export chiffré et une durée de rétention, puis **tester une restauration dans un projet de test** : utilisateurs Auth, parties, reçus, journal, révisions et ressources réservées doivent correspondre au point restauré. Après restauration, comparer comptes et sommes du journal aux parties, confirmer les politiques RLS et tester une commande sans rejouer un ancien gain. Définir la perte de données tolérable et le temps de remise en service ; ce test de restauration reste à effectuer.

Les paiements sont un lot distinct. Réserver une table de paiements avec identifiant prestataire unique, montant/devise/produit vérifiés, événements signés côté serveur, crédit en transaction unique et rapprochement/remboursement auditable. Après restauration, rejouer les événements confirmés du prestataire depuis le dernier point cohérent en conservant leur unicité. La page de retour et le navigateur ne créditent jamais le joueur. Aucun prestataire ni paiement actif n’est intégré ici.

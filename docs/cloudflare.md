# Brigos sur Cloudflare

## Publication automatique depuis main

L’utilisateur autorise le 17 octobre 2026 la publication et le déploiement automatique à chaque push sur `main` de [RobertKaa/Brigos](https://github.com/RobertKaa/Brigos). Les modifications restent locales tant qu’un push n’est pas demandé. GitHub Pages reste actif jusqu’à sa désactivation par l’utilisateur.

Cloudflare **Pages**, offre gratuite, héberge les fichiers du frontend. Auth, PostgreSQL, les commandes du jeu et les secrets restent dans Supabase. Aucun paiement, stockage D1/R2 ou Worker applicatif n’est ajouté. Les quotas Supabase et Resend restent distincts.

L’application GitHub **Cloudflare Workers and Pages** est limitée au seul dépôt `RobertKaa/Brigos`. Utiliser l’intégration Git de Pages, sans jeton Cloudflare ajouté au dépôt ni jeton utilisateur créé pour Workers Builds. Configuration du projet **brigoslab** :

| Réglage | Valeur |
| --- | --- |
| Branche de production | `main` |
| Racine | `/` |
| Build | `npm ci --legacy-peer-deps && npm run ci:cloudflare` |
| Sortie | `dist` |
| Déploiement | Intégration Git native de Cloudflare Pages |
| `SKIP_DEPENDENCY_INSTALL` | `true` |
| Node | `22.23.1` via `.node-version` |
| Autres branches / previews | Désactivées |

Les variables publiques de build nécessaires sont `VITE_SUPABASE_URL=https://zqhnbygwxfqjtbfeuiyg.supabase.co` et `VITE_SUPABASE_PUBLISHABLE_KEY` (clé publique du projet). Ne jamais ajouter de clé serveur Supabase, mot de passe SMTP ou clé Resend. Un test ou build échoué empêche le déploiement et conserve la dernière version active. La liaison n’est confirmée qu’après un build Cloudflare réussi depuis un commit poussé sur `main`.

## Construction locale

Configurer `.env.local` ignoré avec les valeurs publiques de `.env.example`, puis exécuter `npm run ci:cloudflare`. Cette commande teste, vérifie TypeScript et construit sans publier. `build:cloudflare` impose le mode production, le projet Supabase attendu, la base `/` et le retour `https://brigoslab.com/#account`. Seuls les paramètres publics nécessaires sont conservés. Google et Admin restent absents.

La configuration native Pages du tableau de bord définit le projet `brigoslab`, sa sortie `dist`, les variables publiques et les branches. Les builds des autres branches sont désactivés. Le fichier Wrangler préparatoire a été retiré : Pages l’utilisait comme source de vérité et ignorait les variables du tableau de bord. La publication fournit `https://brigoslab.pages.dev/`. Le callback exact de cette adresse, celui du domaine final et les deux retours locaux sont autorisés dans Supabase. Site URL est actuellement `https://brigoslab.pages.dev/`. Les mêmes quatre origines sont autorisées par le backend ; aucune origine générique n’est acceptée. Rattacher `brigoslab.com` après la migration DNS et modifier Site URL à cette occasion.

La navigation utilise les fragments (`#boxes`, `#account`, etc.). Le build copie `scripts/cloudflare-404.html` dans `dist/404.html` pour qu’une ressource inconnue reste une 404 au lieu d’un repli SPA en 200. Cette page est propre au build Cloudflare. `public/_headers` ajoute les protections HTTP et interdit l’intégration dans une iframe.

## Migration DNS au 17 octobre 2026

La zone gratuite est créée dans Cloudflare, compte `550b3b8e2afe8c52a2f934c336003c93`, en attente d’activation. Les 13 entrées OVH ont été importées hors SOA et anciens NS. Les MX OVH, le SPF et les quatre entrées Resend sont conservés. `ftp`, `rsend.auth` et `send.auth` restent en **DNS only**. Les serveurs attribués sont `aida.ns.cloudflare.com` et `ian.ns.cloudflare.com`.

Les serveurs actifs restent `dns103.ovh.net` et `ns103.ovh.net` pendant la transition. Après confirmation explicite de l’utilisateur, OVH a accepté le 17 octobre vers **03:02 CEST** la désactivation de l’ancienne chaîne DNSSEC. Le retrait du DS OVH (clé 57016, algorithme 8, digest type 2) est vérifié au registre à **03:10:25 CEST**. Son ancien TTL vaut **86400 secondes** : attendre au moins le **18 octobre 2026 à 03:11, heure de Paris**, avant de changer les NS. Le délai de sécurité commence au retrait observé du DS, pas au clic dans le manager. Cloudflare refuse encore le domaine racine tant que la zone n’est pas active.

Les sauvegardes et preuves sont ignorées par Git dans `.artifacts/cloudflare/` : `brigoslab.com-before.zone`, `brigoslab.com-cloudflare.zone`, `dns-verification.json` et captures. DKIM, CNAME Resend, DMARC, MX et TXT ont été comparés aux deux serveurs Cloudflare attribués : 12 comparaisons réussies avant migration.

Pour terminer après propagation :

1. Vérifier le retrait du DS chez le registre et les résolveurs publics, puis respecter son ancien TTL. Conserver les clés de la zone OVH pendant ce délai.
2. Remplacer les NS OVH par les deux NS attribués, en gardant les enregistrements email. Attendre le statut **Active** de Cloudflare.
3. Ajouter `brigoslab.com` dans **Custom domains** du projet Pages, remplacer l’entrée de parking lors du rattachement et vérifier le certificat HTTPS.
4. Rediriger HTTPS `www.brigoslab.com` vers la racine en conservant chemin et paramètres. Activer DNSSEC Cloudflare, installer son nouveau DS chez OVH et vérifier la chaîne.
5. Dans Supabase, régler Site URL à `https://brigoslab.com/`, autoriser le retour exact `https://brigoslab.com/#account` et ajouter `https://brigoslab.com` à `BRIGO_ALLOWED_ORIGINS`. Garder les retours locaux et la confirmation email.
6. Tester HTTPS, ressources/404/en-têtes, desktop et mobile 320/390 px, clavier, réduction des animations, comptes et commandes serveur. Tester confirmation et récupération avec l’utilisateur, qui garde mots de passe et liens privés. Recontrôler les emails Resend.

La séparation test/production et les essais de restauration restent prévus dans le [guide Supabase](supabase.md) avant ouverture large et monétisation.

Sources officielles : [intégration Git](https://developers.cloudflare.com/pages/configuration/git-integration/), [configuration de build](https://developers.cloudflare.com/pages/configuration/build-configuration/), [image de build](https://developers.cloudflare.com/pages/configuration/build-image/), [branches](https://developers.cloudflare.com/pages/configuration/branch-build-controls/), [domaines personnalisés](https://developers.cloudflare.com/pages/configuration/custom-domains/).

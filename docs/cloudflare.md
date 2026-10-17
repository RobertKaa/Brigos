# Brigos sur Cloudflare

## Publication automatique depuis main

L’utilisateur autorise le 17 octobre 2026 la publication et le déploiement automatique à chaque push sur `main` de [RobertKaa/Brigos](https://github.com/RobertKaa/Brigos). Les modifications restent locales tant qu’un push n’est pas demandé. GitHub Pages reste actif jusqu’à sa désactivation par l’utilisateur.

Cloudflare **Workers Static Assets**, offre gratuite, héberge les fichiers du frontend. Auth, PostgreSQL, les commandes du jeu et les secrets restent dans Supabase. Aucun paiement, stockage D1/R2 ou Worker applicatif n’est ajouté. Les quotas Supabase et Resend restent distincts.

L’application GitHub **Cloudflare Workers and Pages** est limitée au seul dépôt `RobertKaa/Brigos`. Utiliser Workers Builds natif, sans copier un jeton Cloudflare dans GitHub. Configuration du service **brigos** :

| Réglage | Valeur |
| --- | --- |
| Branche de production | `main` |
| Racine | `/` |
| Build | `npm ci --legacy-peer-deps && npm run ci:cloudflare` |
| Déploiement | `npm run deploy:cloudflare` |
| `SKIP_DEPENDENCY_INSTALL` | `true` |
| Node | `22.23.1` via `.node-version` |
| Wrangler | `4.151.1`, version exacte et lockfile |
| Autres branches / previews | Désactivées |

Les variables publiques de build nécessaires sont `VITE_SUPABASE_URL=https://zqhnbygwxfqjtbfeuiyg.supabase.co` et `VITE_SUPABASE_PUBLISHABLE_KEY` (clé publique du projet). Ne jamais ajouter de clé serveur Supabase, mot de passe SMTP ou clé Resend. Un test ou build échoué empêche le déploiement et conserve la dernière version active. La liaison n’est confirmée qu’après un build Cloudflare réussi depuis un commit poussé sur `main`.

## Construction locale

Configurer `.env.local` ignoré avec les valeurs publiques de `.env.example`, puis exécuter `npm run ci:cloudflare`. Cette commande teste, vérifie TypeScript et construit sans publier. `build:cloudflare` impose le mode production, le projet Supabase attendu, la base `/` et le retour `https://brigoslab.com/#account`. Seuls les paramètres publics nécessaires sont conservés. Google et Admin restent absents.

`wrangler.toml` désactive `workers.dev` et les URL de prévisualisation. Le service peut être publié avant d’avoir une adresse publique. La route du domaine est commentée pendant la migration DNS : ne la décommenter qu’après activation de la zone, sinon le déploiement échoue. Configuration finale :

```toml
[[routes]]
pattern = "brigoslab.com"
custom_domain = true
```

La navigation utilise les fragments (`#boxes`, `#account`, etc.) ; une ressource inconnue reste une 404. `public/_headers` ajoute les protections HTTP et interdit l’intégration dans une iframe.

## Migration DNS au 17 octobre 2026

La zone gratuite est créée dans Cloudflare, compte `550b3b8e2afe8c52a2f934c336003c93`, en attente d’activation. Les 13 entrées OVH ont été importées hors SOA et anciens NS. Les MX OVH, le SPF et les quatre entrées Resend sont conservés. `ftp`, `rsend.auth` et `send.auth` restent en **DNS only**. Les serveurs attribués sont `aida.ns.cloudflare.com` et `ian.ns.cloudflare.com`.

Les serveurs actifs restent `dns103.ovh.net` et `ns103.ovh.net` pendant la transition. Après confirmation explicite de l’utilisateur, OVH a accepté le 17 octobre vers **03:02 CEST** la désactivation de l’ancienne chaîne DNSSEC. L’interface affiche **En cours de désactivation** et annonce environ 24 heures. Le DS OVH (clé 57016, algorithme 8, digest type 2) a un TTL de **86400 secondes**. Ne pas changer les NS tant que le retrait du DS n’est pas effectif et que les anciens caches ne sont pas expirés. Le délai de sécurité commence au retrait effectivement observé du DS, pas au clic dans le manager.

Les sauvegardes et preuves sont ignorées par Git dans `.artifacts/cloudflare/` : `brigoslab.com-before.zone`, `brigoslab.com-cloudflare.zone`, `dns-verification.json` et captures. DKIM, CNAME Resend, DMARC, MX et TXT ont été comparés aux deux serveurs Cloudflare attribués : 12 comparaisons réussies avant migration.

Pour terminer après propagation :

1. Vérifier le retrait du DS chez le registre et les résolveurs publics, puis respecter son ancien TTL. Conserver les clés de la zone OVH pendant ce délai.
2. Remplacer les NS OVH par les deux NS attribués, en gardant les enregistrements email. Attendre le statut **Active** de Cloudflare.
3. Décommenter la route du domaine dans `wrangler.toml`, pousser sur `main`, vérifier le build réussi, le domaine personnalisé et son certificat HTTPS. Remplacer l’entrée de parking lors du rattachement.
4. Rediriger HTTPS `www.brigoslab.com` vers la racine en conservant chemin et paramètres. Activer DNSSEC Cloudflare, installer son nouveau DS chez OVH et vérifier la chaîne.
5. Dans Supabase, régler Site URL à `https://brigoslab.com/`, autoriser le retour exact `https://brigoslab.com/#account` et ajouter `https://brigoslab.com` à `BRIGO_ALLOWED_ORIGINS`. Garder les retours locaux et la confirmation email.
6. Tester HTTPS, ressources/404/en-têtes, desktop et mobile 320/390 px, clavier, réduction des animations, comptes et commandes serveur. Tester confirmation et récupération avec l’utilisateur, qui garde mots de passe et liens privés. Recontrôler les emails Resend.

La séparation test/production et les essais de restauration restent prévus dans le [guide Supabase](supabase.md) avant ouverture large et monétisation.

Sources officielles : [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [configuration CI](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [image de build](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/), [GitHub](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/), [ressources statiques](https://developers.cloudflare.com/workers/static-assets/), [tarification](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [domaines personnalisés](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

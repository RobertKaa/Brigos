# Publier la démo Brigos avec GitHub Pages

Le dépôt est [RobertKaa/Brigos](https://github.com/RobertKaa/Brigos). Son URL Pages prévue est **https://robertkaa.github.io/Brigos/**. La publication est confirmée uniquement après un déploiement réussi et une vérification de cette URL ; ajouter le workflow ne suffit pas.

## Démo disponible avant Supabase

Le workflow impose le jeu invité et la sauvegarde IndexedDB : il vide explicitement les variables publiques Supabase, y compris l’ancienne clé `anon`, et désactive l’admin local. Les comptes restent indisponibles, avec un message explicite. Des variables Supabase ajoutées au dépôt ne les activent pas sur Pages. Cette première publication ne nécessite ni projet Supabase ni clé serveur. La partie sur Pages est distincte de celle de `127.0.0.1:5173`, car les origines diffèrent ; aucune sauvegarde locale n’est transférée automatiquement.

Cette destination sert à la démo gratuite. [Les limites officielles de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) excluent l’hébergement principalement destiné aux transactions commerciales et déconseillent les transactions sensibles, notamment l’envoi de mots de passe. Garder la démo Pages en mode invité. Utiliser un hébergement adapté avant d’y activer les formulaires email/mot de passe ou les microtransactions ; une API externe ne constitue pas, à elle seule, une validation de conformité. Les paiements ne sont pas activés dans cette version.

## Activer la publication

1. Publier les sources validées sur la branche `main` du dépôt. Le dépôt est public et sa branche par défaut est `main` lors de la vérification du 16 octobre 2026.
2. Ouvrir [Settings → Pages](https://github.com/RobertKaa/Brigos/settings/pages), puis choisir **GitHub Actions** dans **Build and deployment → Source**. Un dépôt public permet Pages avec GitHub Free, selon [la documentation de création](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
3. Ouvrir [Actions](https://github.com/RobertKaa/Brigos/actions), choisir **Publish Brigos demo to GitHub Pages**, puis relancer le workflow si l’activation est postérieure au premier push. Restreindre l’environnement `github-pages` à `main`.
4. Attendre les deux jobs `build` et `deploy`. Le lien du déploiement apparaît dans l’environnement `github-pages`. Contrôler les cinq destinations, les images et le mode invité sur ordinateur et mobile.

Le workflow utilise Node.js 22, installe le lockfile avec `npm ci --legacy-peer-deps`, puis exécute `npm test`, `npm run check`, `npm run server:bundle` et `npm run build`. Il déduit `VITE_BASE_PATH=/Brigos/` du nom du dépôt et publie seulement `dist` ; le bundle serveur est vérifié mais ne fait pas partie du site. Les actions officielles sont épinglées par SHA. Le build lit le dépôt ; seul le job de déploiement obtient `pages: write` et `id-token: write`, comme requis pour [un workflow Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

L’activation de **Settings → Pages → GitHub Actions** reste nécessaire une fois. L’action officielle [`configure-pages`](https://github.com/actions/configure-pages/blob/983d7736d9b0ae728b81ab479565c72886d7745b/action.yml) n’active pas Pages par défaut ; son activation automatique demanderait un autre jeton disposant de droits supplémentaires. Ce workflow n’utilise aucun jeton personnel ni secret d’administration.

## Préparer les comptes sur un hébergement adapté

Suivre [la configuration Supabase](supabase.md) pour un frontend hébergé à une adresse adaptée aux comptes et aux futurs achats. Configurer sur cet hébergeur l’URL publique Supabase, sa clé publishable et l’URL exacte de retour `#account`, puis les autorisations Supabase, Google et CORS correspondantes. Ne pas modifier le workflow de démo Pages pour activer les comptes.

Les variables `VITE_*` sont incluses dans le JavaScript public : ne jamais y placer `service_role`, clé `sb_secret_…`, secret OAuth, mot de passe de base ou secret de paiement. Déployer aussi les migrations et la fonction serveur du jeu avant de proposer une partie connectée. GitHub Pages n’exécute ni PostgreSQL ni les fonctions Supabase.

## Vérification et limites

Vérifier l’absence d’erreur 404 sous `/Brigos/`, les liens `#boxes`, `#workshop`, `#sandbox`, `#collection` et `#journal`, ainsi que les ressources chargées à la demande. Tester à 390 et 320 px, au clavier et avec les animations réduites. Le statut vert de GitHub Actions confirme le déploiement, puis la vérification de l’URL publique confirme son accessibilité.

Une modification de nom de dépôt change le sous-dossier. Un domaine personnalisé demande de revoir `VITE_BASE_PATH` avant publication. Les limites de taille, trafic et durée de build de Pages s’appliquent toujours. La disponibilité de cette démo ne confirme pas celle d’un backend Supabase.

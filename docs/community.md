# Galeries et profils de joueurs

**Galeries des joueurs** ouvre les vues **Créations / Joueurs / Mon profil** dans le jeu réel, depuis les écrans de jeu et depuis Libre. Les cinq destinations principales restent inchangées. **Ma galerie** conserve les projets privés.

## Publication et confidentialité

La communauté est accessible aux comptes connectés avec une adresse confirmée. L’invité voit une invitation à ouvrir son compte ; aucune donnée de sa partie locale n’est envoyée. La partie serveur reste séparée de la partie invitée.

Le profil communautaire est distinct des métadonnées Auth. Il commence privé, sans copie automatique de pseudo ou d’adresse. Le joueur choisit son pseudo public, sa présentation facultative et une couleur pour l’avatar Brigos existant. Il enregistre la visibilité du profil avant de publier individuellement une création. **Exposer dans Ma galerie ne publie rien.**

La publication copie le titre, la présentation et les placements du projet exposé depuis **la partie persistée du compte appelant**. Le navigateur fournit uniquement l’identifiant de projet. Les modifications du projet ne deviennent publiques qu’après **Actualiser le partage**. Aucun gain, déplacement de stock ou changement de révision de partie ne résulte de ces actions.

Retirer un partage conserve le projet et ses réservations. Masquer le profil masque aussi ses publications et leurs liens directs. Réactiver le profil réaffiche ses partages conservés : le formulaire l’explique. Retirer l’exposition personnelle, supprimer le projet ou retirer sa dernière pièce supprime son partage dans la même transaction de partie. Une création modérée conserve un marqueur privé qui empêche de contourner le masque par retrait et republication.

## Architecture et sécurité

La migration `supabase/migrations/202610180001_brigo_community.sql` ajoute quatre tables indépendantes : profils publics, copies publiées, signalements privés et compteur de requêtes. Elle ne change ni la sauvegarde v11, ni les recettes ou identifiants historiques.

RLS est active et les rôles navigateur n’ont aucun accès direct à ces tables. La seule API joueur est la RPC `brigo_community(action,input)`, fonction `security definer` à chemin de recherche vide. Elle déduit le propriétaire de `auth.uid()`, vérifie le compte confirmé et non anonyme, refuse les champs inconnus et les corps de plus de 2 Kio, puis applique une limite de **120 requêtes/minute/compte** en base. Aucun UUID propriétaire n’est accepté en argument.

Les lectures utilisent une projection explicite : aucun e-mail, UUID Auth, identifiant de projet privé, inventaire ou sauvegarde. Chaque profil et publication possède un identifiant public aléatoire indépendant. Les textes sont affichés comme texte React ; aucun HTML, URL d’avatar externe ou SVG utilisateur n’est exécuté. Les réponses sont également bornées et validées côté client.

La recherche est une sous-chaîne littérale ; `%` et `_` n’ont aucun pouvoir SQL. La pagination retourne 12 joueurs ou 6 créations, jusqu’à la page 1000. Les retours conservent recherche, page, défilement et focus. Les aperçus réutilisent le rendu SVG léger et les formes originales Brigos ; ils se préparent près de la zone visible, sans moteur 3D ni boucle GPU.

Les RPC passent en POST avec `cache: no-store`, sans cache applicatif des données publiques. Les détails sont relus après navigation et reprise du focus de la fenêtre. Une réponse tardive d’une ancienne vue est ignorée. Un changement de compte démonte l’écran, et le transport capture le jeton du compte attendu avant l’envoi.

Chaque enregistrement de profil transmet aussi sa révision attendue. Un formulaire ancien ne peut donc pas réactiver une visibilité retirée depuis une autre fenêtre : le serveur refuse la modification et demande une actualisation. Cette révision est privée et ne change pas la sauvegarde de jeu.

## Signalements et modération

**Signaler** ouvre un dialogue avec trois motifs : contenu inapproprié, droits/originalité et spam. Le rapport reste privé et ne masque pas automatiquement le contenu. Les doublons sont ignorés ; cinq nouveaux signalements par jour sont autorisés par compte.

Depuis une console SQL de confiance, examiner les rapports :

```sql
select target_kind, target_id, reason, created_at
from public.brigo_community_reports
order by created_at desc
limit 100;
```

Masquer une cible en remplaçant l’UUID d’exemple par son identifiant public :

```sql
select public.brigo_community_moderate(
  'creation', '00000000-0000-4000-8000-000000000000'::uuid, true
);
```

Employer `'profile'` pour masquer un profil et tous ses partages ; `false` lève le masque après examen. Cette fonction est interdite à `anon` et `authenticated` ; elle est réservée à la console de confiance ou au rôle serveur. Aucun panneau admin local n’obtient ces droits. Une modification de profil ou de création par l’auteur ne lève pas le masque. Suivre [la politique d’originalité Brigos](originality-policy.md) lors de l’examen.

## Mise en service

La migration `202610180001_brigo_community` a été appliquée et enregistrée sur le projet Brigos le **18 octobre 2026**, après autorisation explicite. Elle a été vérifiée sur le serveur avec deux identités temporaires dans une transaction intégralement annulée : publication, consultation, propriété, retrait par lien direct et rejet d’un ancien consentement. Aucun compte ou contenu de test n’est conservé.

Les fonctions de jeu doivent exécuter le moteur v11 pour gérer les expositions personnelles. Publier l’interface v11 par le déploiement automatique Cloudflare avant de mettre à jour le moteur Supabase, pour que les nouvelles sauvegardes restent lisibles par l’interface publiée. La publication sur main et cette mise à jour du moteur ont été autorisées ensemble. Pour les prochaines migrations, vérifier l’historique et ne pas rejouer la migration initiale. Aucun nouveau secret ou stockage public n’est nécessaire pour la communauté.

Sans la RPC, le jeu affiche « Les galeries partagées ne sont pas encore activées sur ce serveur ». Il ne simule pas une communauté vide et n’expose aucun diagnostic SQL.

## Vérification

Les tests PostgreSQL PGlite exécutent les deux vraies migrations : consentement, propriété, champs publics, économie inchangée, retrait direct, nettoyage transactionnel et rollback, modération persistante, RLS, authentification et limites. Les tests client/React couvrent validation, absence de cache, jeton capturé, navigation, réponses tardives, doubles clics, erreurs, confidentialité invitée et focus.

`communityFlow.test.ts` relie également le transport navigateur réel à la vraie RPC PostgreSQL pour le parcours complet entre deux comptes jetables. La vérification du 18 octobre valide **2 451 tests**, TypeScript, le build Cloudflare et le bundle serveur. L’aperçu des écrans réels a été vérifié sur desktop et à 320/390 px, en clair/sombre, avec animations réduites, sans débordement horizontal ; le dialogue de signalement s’affiche entièrement et Échap restitue le focus. Les preuves sont dans `.artifacts/community-live/`, ignoré par Git.

La revue Supabase signale la [RPC security definer accessible aux comptes connectés](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) : c’est le point d’entrée voulu et contrôlé, avec propriétaire issu de `auth.uid()`, liste de champs autorisés et aucune lecture directe des tables. L’absence de politique sur les quatre tables communautaires est intentionnelle : accès direct refusé par défaut et privilèges retirés. Une alerte Auth préexistante concerne la [protection contre les mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), hors de cette fonctionnalité ; aucun réglage Auth n’a été affaibli.

`scripts/review-community.html#community` emploie **GameApp et les écrans réels** avec des joueurs fictifs et un service en mémoire, sans compte, stockage, sauvegarde ou publication réelle. L’avertissement d’aperçu reste visible. Les scénarios `?scenario=empty`, `error`, `guest`, `private`, `hidden` et `loading` permettent d’examiner les autres états. Vérifier desktop, 320/390 px, clair/sombre, clavier et réduction des animations.

Avant livraison : `npm test`, `npm run check`, `npm run build`, `npm run server:bundle`. Avant ouverture : appliquer la migration sur test et vérifier avec deux comptes confirmés réels publication, retrait, isolation et modération. Les tests PGlite ne remplacent pas ce contrôle réseau de mise en service.

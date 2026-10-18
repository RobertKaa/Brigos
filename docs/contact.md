# Contact et mentions légales Brigos

La page `#mentions-legales` et le pied de page donnent accès au formulaire `#contact`. L’éditeur est présenté sous le pseudo **TreborKaa**, à la demande de l’utilisateur le 18 octobre 2026. Cette présentation provisoire ne vaut pas validation juridique. La finalisation du statut, des coordonnées et de la direction de publication est suivie dans [le ticket Trello](https://trello.com/c/PK9HVdJB).

La finalisation du formulaire et l’activation de l’envoi réel ont leur [ticket dédié](https://trello.com/c/Sd7MF25m), distinct de la page de mentions légales.

## Envoi et configuration serveur

Le code est préparé localement. Aucun service de contact n’est déployé ou configuré par ce changement. Sans configuration, le formulaire affiche son indisponibilité et ne prétend pas envoyer de messages.

Le navigateur appelle la nouvelle Edge Function Supabase `contact`. Elle vérifie l’origine autorisée, le type et la taille du contenu, les champs et un jeton Turnstile à usage unique (succès, action `contact`, nom d’hôte exact). Elle envoie un message en texte brut via Resend à une adresse fixée côté serveur. Le visiteur ne peut choisir ni destinataire ni expéditeur ; son e-mail est uniquement utilisé comme adresse de réponse. Une clé d’idempotence évite les doublons lorsque le même message est réessayé. Aucun contenu de message, secret ni destinataire n’est journalisé ou ajouté au bundle frontend. Les messages ne sont pas enregistrés dans la sauvegarde du jeu.

Préparer au moment de la mise en service autorisée :

1. Créer un widget Cloudflare Turnstile limité aux noms d’hôte du site ; conserver les clés de test hors production.
2. Ajouter sa **clé publique** comme `VITE_CONTACT_TURNSTILE_SITE_KEY` dans le build Cloudflare. Le script `build:cloudflare` conserve uniquement ce réglage public et les réglages publics déjà autorisés. Le script Turnstile ne se charge que sur la page Contact configurée.
3. Créer une clé Resend dédiée à l’envoi, restreinte au domaine vérifié. Ne pas extraire ni réutiliser le secret SMTP enregistré pour les comptes. L’expéditeur doit appartenir à un domaine déjà vérifié ; une adresse d’expédition ne crée pas une boîte de réception.
4. Renseigner dans les secrets de la fonction `BRIGOS_CONTACT_TO` (adresse de réception communiquée par l’utilisateur), `BRIGOS_CONTACT_FROM`, `BRIGOS_CONTACT_RESEND_KEY`, `BRIGOS_CONTACT_TURNSTILE_SECRET`, ainsi que `BRIGO_ALLOWED_ORIGINS` (liste exacte, sans joker). Un fichier local ignoré `.artifacts/contact/contact.env` prépare le destinataire sans le publier. Ne jamais mettre ces quatre valeurs dans des variables `VITE_*`, dans Trello ou dans des captures.
5. Exécuter `npm run server:bundle`, puis déployer uniquement la fonction `contact` après autorisation de publication. `verify_jwt = false` concerne cette route publique ; ses vérifications anti-spam restent obligatoires. Le handler `game` et son authentification ne changent pas.
6. Lors de la publication demandée, laisser la vérification et le déploiement frontend passer par le push sur `main` et l’intégration Git Cloudflare habituelle. Effectuer ensuite un envoi réel avec autorisation et confirmer la réception dans la boîte cible. Les tests locaux utilisent des prestataires simulés et ne constituent pas une preuve de livraison réelle.

Le formulaire est destiné au contact ordinaire. Avant une ouverture publique, finaliser aussi l’information sur les traitements de données (responsable, finalités, base légale, conservation, droits et contact), les sous-traitants et les protections contre les abus selon le trafic attendu. Ne pas promettre une conformité juridique sur la seule base des tests.

## Sources vérifiées le 18 octobre 2026

- [Mentions obligatoires — Service Public](https://entreprendre.service-public.gouv.fr/vosdroits/F37351)
- [LCEN, article 1-1 — Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049568614)
- [Cloudflare, coordonnées](https://www.cloudflare.com/privacypolicy/)
- [GitHub, coordonnées](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
- [Turnstile côté navigateur](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/) et [vérification serveur](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [API d’envoi Resend](https://resend.com/docs/api-reference/emails/send-email) et [idempotence](https://resend.com/changelog/idempotency-keys)

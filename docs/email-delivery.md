# Emails de compte Brigos

## État au 17 octobre 2026

Le domaine `brigoslab.com` appartient au projet. Les serveurs DNS publics sont
`dns103.ovh.net` et `ns103.ovh.net`. La racine possède déjà des MX OVH et un SPF
OVH : les conserver pour la réception des emails.

Le domaine d’envoi `auth.brigoslab.com` est ajouté dans Resend en Irlande
(`eu-west-1`), identifiant `af475baa-706e-4b80-9a7e-ef092fd9f720`.
Après autorisation de l’utilisateur, les quatre entrées DNS ci-dessous ont été
ajoutées chez OVH et vérifiées sur le serveur autoritaire ainsi que sur le
résolveur public `1.1.1.1`. Les trois MX de la racine restent ceux d’OVH.

Resend confirme ensuite le statut **Verified** pour le domaine et ses trois
entrées nécessaires à l’envoi. La réception Resend est désactivée et aucun
sous-domaine de suivi des liens n’est configuré.

Le SMTP personnalisé du projet Supabase `zqhnbygwxfqjtbfeuiyg` est **enregistré
et actif**, état confirmé après rechargement du dashboard. L’utilisateur a créé
la clé depuis le formulaire préparé avec `Sending access`, limité à
`auth.brigoslab.com`, et l’a saisie directement dans Supabase. Le dashboard
confirme qu’un mot de passe SMTP est stocké et masqué ; sa valeur n’a pas été
lue ni copiée dans le dépôt.

La confirmation d’email reste obligatoire ; Google et les sessions anonymes
restent désactivés. Le 17 octobre 2026, l’utilisateur confirme un essai réel
réussi : inscription de test, réception de l’email, validation de l’adresse et
connexion au jeu. Le parcours de récupération du mot de passe n’a pas encore
été testé par un nouvel essai réel après ce changement SMTP.

## Domaine d’envoi et DNS

Utiliser un domaine d’envoi réservé aux comptes, `auth.brigoslab.com`, et
l’expéditeur `Brigos <comptes@auth.brigoslab.com>`. Cette adresse d’expédition
ne crée pas automatiquement une boîte de réception.

1. Dans Resend, ajouter `auth.brigoslab.com` et choisir une région européenne
   disponible avant la première vérification.
2. Dans la zone OVH, ajouter exactement les entrées DKIM et d’envoi fournies par
   Resend. Pour ce domaine créé le 17 octobre 2026 en Irlande, le dashboard
   fournit un TXT DKIM sur `resend._domainkey.auth` et deux CNAME :
   `rsend.auth` vers `rsend-euw1.forge.rmta.net.` et `send.auth` vers
   `send.forge.rmta.net.`. Ce sont les valeurs observées dans ce compte ; ne pas
   les remplacer par les anciens exemples SPF/MX Amazon SES. Les valeurs peuvent
   différer pour un autre domaine ou une autre région.
3. Saisir les noms relatifs à la zone `brigoslab.com` dans OVH, sans répéter
   le suffixe que son interface ajoute automatiquement.
4. Garder les MX et le SPF existants de la racine. Ne pas activer la réception
   Resend et ne pas remplacer les serveurs DNS pour configurer ce SMTP.
5. Ajouter un DMARC au domaine d’envoi, initialement
   `_dmarc.auth.brigoslab.com TXT "v=DMARC1; p=none;"`, si aucun enregistrement
   DMARC n’existe à cet emplacement. Ne pas créer plusieurs SPF ou DMARC au même
   nom. Une politique plus stricte exige d’abord de vérifier les envois réels.
6. Attendre que Resend confirme les entrées de vérification. Désactiver le suivi
   des ouvertures et des liens pour conserver les URL de confirmation intactes.

La configuration DNS du site web est distincte. Le choix de son hébergeur reste
nécessaire avant de modifier l’adresse web ou les retours de connexion.

## SMTP Supabase

Créer dans Resend une clé dédiée `Brigos Supabase Auth`, avec la permission
`Sending access` limitée au domaine vérifié. La saisir directement dans le
dashboard Supabase ; ne pas la placer dans le chat, le dépôt, une capture, un
journal ni une variable `VITE_*`.

| Réglage | Valeur prévue |
| --- | --- |
| Sender email | `comptes@auth.brigoslab.com` |
| Sender name | `Brigos` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Clé Resend dédiée, conservée dans Supabase uniquement |

Conserver **Confirm email**, le changement d’email avec double confirmation et
les redirections locales déjà autorisées. Garder `{{ .ConfirmationURL }}` dans
les modèles de confirmation et de récupération. Ne pas ajouter une redirection
publique avant que l’application soit effectivement disponible en HTTPS à cette
adresse. La [démo GitHub Pages](github-pages.md) reste invitée.

Conserver une limite d’envoi Supabase adaptée aux essais et aux quotas gratuits
Resend affichés au compte, sans activer de dépassement payant. Les limites SMTP
ne remplacent pas les délais de renvoi individuels d’Auth.

## Vérification de mise en service

L’utilisateur saisit lui-même son mot de passe dans l’application. Effectuer
une inscription réelle, vérifier la réception et le statut de livraison Resend,
puis ouvrir le lien dans le même navigateur que la demande PKCE. Confirmer que
la partie connectée devient disponible seulement après validation de l’email.
Vérifier aussi le renvoi de confirmation et la récupération du mot de passe,
dont la saisie reste effectuée par l’utilisateur.

Noter la date de vérification, la région Resend, les statuts DNS, l’expéditeur
enregistré et les résultats de livraison, sans enregistrer les clés, les jetons
des liens ou les mots de passe. Le statut « domaine vérifié » seul ne prouve pas
qu’un email de confirmation a été reçu et utilisé avec succès.

Sources officielles : [SMTP Resend pour Supabase](https://resend.com/docs/send-with-supabase-smtp),
[domaines vérifiés](https://resend.com/docs/dashboard/domains/introduction),
[régions](https://resend.com/docs/dashboard/domains/regions),
[clés API](https://resend.com/docs/dashboard/api-keys/introduction),
[DMARC](https://resend.com/docs/dashboard/domains/dmarc),
[SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

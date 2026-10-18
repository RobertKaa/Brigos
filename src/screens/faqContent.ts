import { BOX_DROP_COUNT } from "../game/catalog";
import { normalizeSearch } from "../game/search";

type FaqLink = {
  href:
    | "#boxes"
    | "#collection"
    | "#workshop"
    | "#workshop?view=built"
    | "#sandbox"
    | "#community"
    | "#journal";
  label: string;
};
export type FaqQuestion = {
  id: string;
  question: string;
  paragraphs: readonly string[];
  link?: FaqLink;
};
export type FaqGroup = {
  id: string;
  title: string;
  questions: readonly FaqQuestion[];
};

/** Player-facing explanations, checked against docs/ux-flows, daily-journal,
 * sandbox, production, supabase and the current catalogue. */
export const FAQ_GROUPS: readonly FaqGroup[] = [
  {
    id: "debuter",
    title: "Bien démarrer",
    questions: [
      {
        id: "premiers-pas",
        question: "Par où commencer dans Brigos ?",
        paragraphs: [
          "Récupérez votre cadeau dans Quêtes, puis ouvrez une boîte dans Boîtes pour découvrir vos premiers Brigos. Vous pourrez ensuite choisir un plan dans l’Atelier ou imaginer une création dans Libre.",
        ],
        link: { href: "#journal", label: "Découvrir les quêtes" },
      },
      {
        id: "monnaie-brigos",
        question:
          "Quelle différence entre les pièces de monnaie et les Brigos ?",
        paragraphs: [
          "Les pièces de monnaie sont votre monnaie de jeu : votre solde apparaît dans l’en-tête. Elles servent notamment à acheter des boîtes ou à commander des matériaux.",
          "Les Brigos sont les pièces de construction de votre collection. Chaque exemplaire possède une forme, une couleur et une rareté ; vous les utilisez pour assembler vos créations.",
        ],
      },
      {
        id: "zero-ressource",
        question: "Je n’ai plus de monnaie ni de boîte. Comment continuer ?",
        paragraphs: [
          "Le cadeau du jour et le circuit dans Quêtes restent accessibles sans dépenser de monnaie. Le cadeau offre notamment une boîte Découverte. Les missions permettent ensuite de gagner d’autres récompenses.",
          "Si vous avez déjà récupéré vos récompenses du jour, revenez au prochain renouvellement. Les constructions sur plan peuvent aussi produire de la monnaie à récolter dans l’Atelier.",
        ],
        link: { href: "#journal", label: "Voir les récompenses disponibles" },
      },
    ],
  },
  {
    id: "collection",
    title: "Boîtes et Collection",
    questions: [
      {
        id: "ouvrir-boite",
        question: "Comment ouvrir une boîte et que contient-elle ?",
        paragraphs: [
          `Choisissez une boîte dans Boîtes. Si vous en avez en réserve, l’action utilise cet exemplaire ; sinon, elle indique le prix de l’achat suivi de l’ouverture. Chaque boîte contient ${BOX_DROP_COUNT} Brigos.`,
          "Après l’ouverture, révélez les cartes à votre rythme ou utilisez Tout révéler. Vos nouveaux exemplaires rejoignent votre collection.",
        ],
        link: { href: "#boxes", label: "Choisir une boîte" },
      },
      {
        id: "probabilites",
        question: "Une boîte garantit-elle un Brigo rare ou légendaire ?",
        paragraphs: [
          "Chaque boîte a ses propres probabilités de rareté. Elles sont consultables avant l’ouverture, dans les informations sur les chances de la boîte.",
          "Une boîte plus coûteuse ne garantit pas une rareté précise. La couleur de son emballage ne représente pas une promesse de tirage.",
        ],
        link: {
          href: "#boxes",
          label: "Consulter les boîtes et leurs chances",
        },
      },
      {
        id: "album-stock",
        question:
          "Pourquoi un Brigo de mon album n’est-il pas disponible pour construire ?",
        paragraphs: [
          "L’album garde la trace de vos découvertes, même si vous avez utilisé ou recyclé un exemplaire. Il se distingue du stock réellement disponible.",
          "Les Brigos engagés dans une construction de l’Atelier ou un projet Libre sont réservés. Pour les réutiliser, retirez-les de votre projet libre ou démontez la construction qui les utilise.",
        ],
        link: { href: "#collection", label: "Voir mon album et mon stock" },
      },
    ],
  },
  {
    id: "construire",
    title: "Atelier et Libre",
    questions: [
      {
        id: "assembler-plan",
        question: "Comment assembler un plan si des pièces me manquent ?",
        paragraphs: [
          "Dans l’Atelier, ouvrez la fiche d’un plan pour consulter les pièces nécessaires et votre progression. Vous pouvez commander les matériaux manquants avec votre monnaie, au prix affiché.",
          "La commande ajoute les matériaux à votre stock. Assemblez ensuite le plan avec l’action dédiée ; vous retrouverez le résultat dans Mes créations.",
        ],
        link: { href: "#workshop", label: "Parcourir les plans" },
      },
      {
        id: "demonter",
        question: "Que deviennent mes Brigos lorsque je démonte une création ?",
        paragraphs: [
          "Le démontage restitue les exemplaires qui étaient réservés pour cette création, avec leurs références et leurs couleurs. Retirer une pièce d’un projet Libre rend également ce même exemplaire à votre stock.",
          "Ces pièces ne sont pas dupliquées : elles deviennent simplement disponibles pour une autre construction.",
        ],
        link: {
          href: "#workshop?view=built",
          label: "Retrouver mes créations",
        },
      },
      {
        id: "mode-libre",
        question: "Que permet le mode Libre ?",
        paragraphs: [
          "Libre vous permet de créer vos propres projets sans suivre un plan. Chaque pièce posée provient de votre stock disponible ; la déplacer ou la tourner conserve le même exemplaire.",
          "Ma galerie rassemble vos projets. Choisissez Reprendre pour continuer une construction, ou Exposer pour choisir son titre, son angle et son fond. Vous pouvez mettre une exposition en vedette ; la retirer de la galerie conserve le projet et ses pièces réservées.",
          "Les créations libres ne produisent pas de monnaie. Si la vue 3D n’est pas disponible, une vue de secours permet de poursuivre la construction.",
        ],
        link: { href: "#sandbox", label: "Retrouver ma galerie" },
      },
      {
        id: "galeries-joueurs",
        question:
          "Comment découvrir les autres joueurs et partager une création ?",
        paragraphs: [
          "Ouvrez Galeries des joueurs, puis connectez-vous à votre compte. Créations présente les partages de la communauté ; Joueurs permet de rechercher un pseudo et d’ouvrir son profil et sa galerie.",
          "Dans Mon profil, choisissez votre pseudo et rendez votre profil visible. Vous pouvez ensuite publier individuellement les créations déjà exposées dans votre galerie personnelle. Exposer seul ne partage rien avec les autres joueurs.",
          "Retirer un partage conserve votre projet. Masquer votre profil masque aussi ses publications. Les changements d’une construction ne deviennent publics qu’après avoir actualisé son partage ; aucun revenu ou Brigo supplémentaire n’est accordé.",
        ],
        link: {
          href: "#community",
          label: "Découvrir les galeries des joueurs",
        },
      },
    ],
  },
  {
    id: "quetes",
    title: "Quêtes et production",
    questions: [
      {
        id: "renouvellement",
        question: "Quand les récompenses quotidiennes se renouvellent-elles ?",
        paragraphs: [
          "Le cadeau, le circuit et les missions suivent le jour UTC. Leur renouvellement ne correspond donc pas toujours à minuit dans votre fuseau horaire.",
          "Chaque récompense se récupère une seule fois pour la journée concernée. Consultez Quêtes pour voir ce qui est disponible ou déjà récupéré.",
        ],
        link: { href: "#journal", label: "Consulter les quêtes du jour" },
      },
      {
        id: "jour-manque",
        question:
          "Est-ce que je perds quelque chose si je ne joue pas tous les jours ?",
        paragraphs: [
          "Aucun jour manqué ne retire de monnaie ni de tampon du passeport. Le passeport avance lorsque vous récupérez le cadeau du jour, sans exiger de visites consécutives.",
          "Les récompenses quotidiennes des jours passés ne s’accumulent pas : vous retrouvez celles du jour à votre retour.",
        ],
      },
      {
        id: "production",
        question:
          "Comment récupérer la monnaie produite par mes constructions ?",
        paragraphs: [
          "Les constructions réalisées sur plan produisent uniquement de la monnaie. Dans l’Atelier, ouvrez Mes créations puis utilisez Récolter. Les projets Libre ne génèrent pas de revenu.",
          "Selon la taille du plan, un cycle dure 1, 2, 4 ou 8 heures. La première récolte demande un cycle complet ; la réserve peut conserver jusqu’à 72 heures de production. Le montant disponible et le temps restant sont indiqués sur vos créations.",
        ],
        link: { href: "#workshop?view=built", label: "Voir mes récoltes" },
      },
    ],
  },
  {
    id: "sauvegarde",
    title: "Compte et sauvegarde",
    questions: [
      {
        id: "invite-compte",
        question: "Quelle différence entre jouer en invité et avec un compte ?",
        paragraphs: [
          "En invité, votre partie reste dans le navigateur de cet appareil. Avec un compte, votre progression en ligne est liée à ce compte et vous pouvez la retrouver en vous connectant depuis un autre appareil.",
          "Créer un compte démarre une partie en ligne distincte : la partie invitée n’est ni importée ni fusionnée automatiquement. Le mode connecté nécessite une connexion Internet.",
        ],
      },
      {
        id: "sauvegarde-locale",
        question: "Comment savoir si ma partie est sauvegardée ?",
        paragraphs: [
          "Le pied de page indique si la partie est sauvegardée sur cet appareil ou sur votre compte. Une mention Session temporaire signifie que la sauvegarde locale n’est pas disponible.",
          "En invité, effacer les données du site ou changer de navigateur peut vous faire perdre l’accès à votre progression locale. En ligne, si une action est interrompue, utilisez Actualiser pour vérifier son résultat avant de réessayer.",
        ],
      },
      {
        id: "connexion",
        question: "Je n’arrive pas à me connecter. Que faire ?",
        paragraphs: [
          "Ouvrez Mon compte dans l’en-tête. Après une inscription, confirmez d’abord votre adresse e-mail. Si le message manque, vérifiez vos courriers indésirables puis utilisez Email de confirmation non reçu ? pour demander un nouveau lien.",
          "Si vous avez oublié votre mot de passe, utilisez Mot de passe oublié ? depuis le même panneau. Assurez-vous également que votre connexion Internet fonctionne.",
        ],
      },
    ],
  },
];

/** Search is local, accent-insensitive and never interpreted as markup or a URL. */
export function filterFaqGroups(query: string): FaqGroup[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  return FAQ_GROUPS.map((group) => ({
    ...group,
    questions: group.questions.filter((item) => {
      const text = normalizeSearch(
        [group.title, item.question, ...item.paragraphs].join(" "),
      );
      return words.every((word) => text.includes(word));
    }),
  })).filter((group) => group.questions.length > 0);
}

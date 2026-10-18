import { useEffect, useRef, useState } from "react";
import type { AnchorHTMLAttributes } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  Frame,
  Globe,
  Search,
  Star,
  Users,
} from "lucide-react";
import { BrigoLogo } from "../components/BrigoLogo";
import { FreeCreationPreview } from "../components/FreeCreationPreview";
import { Modal } from "../components/Modal";
import {
  CommunityError,
  parseCommunityPage,
  parseOwnCommunity,
  parsePublicCreation,
} from "../community";
import type {
  CommunityApi,
  CommunityPage,
  OwnCommunity,
  PublicCreation,
  PublicProfile,
} from "../community";
import type { AppRoute } from "../navigation";
import { appRouteHref } from "../navigation";
import type { Game } from "./types";
import "./free-mode.css";
import "./community.css";

const positions = new Map<string, { y: number; focus: string }>();
function RememberLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      onClick={(event) => {
        const key = location.hash;
        positions.delete(key);
        positions.set(key, {
          y: window.scrollY,
          focus: event.currentTarget.getAttribute("href") ?? "",
        });
        if (positions.size > 40)
          positions.delete(positions.keys().next().value!);
        props.onClick?.(event);
      }}
    />
  );
}
function Avatar({ profile }: { profile: PublicProfile }) {
  return (
    <span className={`community-avatar community-avatar-${profile.avatar}`}>
      <BrigoLogo variant="mark" />
    </span>
  );
}
function CreationArt({ creation }: { creation: PublicCreation }) {
  const element = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!element.current || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={element} className="community-preview">
      {visible ? (
        <FreeCreationPreview
          project={{
            id: creation.id,
            name: creation.title,
            createdAt: creation.publishedAt,
            updatedAt: creation.publishedAt,
            placements: creation.placements,
          }}
          rotation={creation.rotation}
          backgroundId={creation.backgroundId}
        />
      ) : (
        <div className="free-art" aria-hidden="true">
          <Frame size={30} />
        </div>
      )}
    </div>
  );
}
function Pager({
  page,
  hasMore,
  href,
}: {
  page: number;
  hasMore: boolean;
  href: (page: number) => string;
}) {
  return (
    <nav className="community-pager" aria-label="Pages des résultats">
      {page > 1 ? (
        <RememberLink className="free-secondary" href={href(page - 1)}>
          <ArrowLeft size={16} />
          Précédente
        </RememberLink>
      ) : (
        <span />
      )}
      <span>Page {page}</span>
      {hasMore && page < 1000 ? (
        <RememberLink className="free-secondary" href={href(page + 1)}>
          Suivante
          <ArrowRight size={16} />
        </RememberLink>
      ) : (
        <span />
      )}
    </nav>
  );
}
function ProfileForm({
  own,
  busy,
  onSave,
}: {
  own: OwnCommunity;
  busy: boolean;
  onSave: (input: Record<string, unknown>) => Promise<void>;
}) {
  const p = own.profile;
  const [pseudo, setPseudo] = useState(p?.pseudo ?? "");
  const [bio, setBio] = useState(p?.bio ?? "");
  const [avatar, setAvatar] = useState(p?.avatar ?? "coral");
  const [visible, setVisible] = useState(p?.visible ?? false);
  const [featured, setFeatured] = useState(p?.featuredCreationId ?? "");
  useEffect(() => {
    setPseudo(p?.pseudo ?? "");
  }, [p?.id, p?.pseudo]);
  useEffect(() => {
    setBio(p?.bio ?? "");
  }, [p?.id, p?.bio]);
  useEffect(() => {
    setAvatar(p?.avatar ?? "coral");
  }, [p?.id, p?.avatar]);
  useEffect(() => {
    setVisible(p?.visible ?? false);
  }, [p?.id, p?.visible]);
  useEffect(() => {
    setFeatured(p?.featuredCreationId ?? "");
  }, [p?.id, p?.featuredCreationId]);
  return (
    <form
      className="community-profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          pseudo,
          bio,
          avatar,
          visible,
          featuredCreationId: featured || null,
          expectedRevision: p?.revision ?? 0,
        });
      }}
    >
      <h2>Mon profil de joueur</h2>
      <p className="free-help">
        Choisissez ce que les autres joueurs pourront voir. Votre adresse e-mail
        et votre inventaire restent privés.
      </p>
      {p?.moderated && (
        <p role="status" className="free-error">
          Votre profil est masqué par la modération. Vos modifications ne le
          rendront pas visible.
        </p>
      )}
      <fieldset disabled={busy}>
        <label>
          Pseudo public
          <input
            required
            maxLength={40}
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
          />
        </label>
        <label>
          Présentation{" "}
          <span className="free-meta">facultative · 240 caractères</span>
          <input
            maxLength={240}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
        <label>
          Couleur de l’avatar Brigos
          <select
            value={avatar}
            onChange={(e) =>
              setAvatar(e.target.value as PublicProfile["avatar"])
            }
          >
            <option value="coral">Corail</option>
            <option value="mint">Menthe</option>
            <option value="gold">Doré</option>
          </select>
        </label>
        <label>
          Création mise en avant
          <select
            value={featured}
            onChange={(e) => setFeatured(e.target.value)}
          >
            <option value="">Aucune</option>
            {own.creations
              .filter((c) => !c.moderated)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>
        </label>
        <label className="community-consent">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          <span>
            Rendre mon profil et mes publications visibles aux joueurs
            connectés.
          </span>
        </label>
        <p className="free-help">
          Masquer le profil masque aussi toutes ses publications. Les rendre à
          nouveau visibles réaffichera les créations déjà partagées.
        </p>
        <button
          type="submit"
          className="free-primary"
          disabled={!pseudo.trim()}
        >
          {busy ? "Enregistrement…" : "Enregistrer mon profil"}
        </button>
      </fieldset>
    </form>
  );
}

export function Community({
  game,
  route,
  api,
  signedIn,
  onOpenAccount,
}: {
  game: Game;
  route: AppRoute;
  api: CommunityApi;
  signedIn: boolean;
  onOpenAccount?: () => void;
}) {
  const [data, setData] = useState<CommunityPage | null>(null);
  const [creation, setCreation] = useState<PublicCreation | null>(null);
  const [own, setOwn] = useState<OwnCommunity | null>(null);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [report, setReport] = useState<{
    id: string;
    kind: "profile" | "creation";
  } | null>(null);
  const [reason, setReason] = useState("inappropriate");
  const [query, setQuery] = useState(route.communityQuery ?? "");
  const tab = route.communityTab ?? "creations",
    q = route.communityQuery ?? "",
    page = route.communityPage ?? 1;
  const player = route.communityPlayerId,
    selected = route.communityCreationId,
    galleryPage = route.communityGalleryPage ?? 1;
  const href = (patch: Partial<AppRoute>) =>
    appRouteHref({ ...route, ...patch, view: "community" });
  const rootHref = href({
    communityPlayerId: undefined,
    communityCreationId: undefined,
    communityGalleryPage: 1,
  });
  useEffect(() => {
    setQuery(q);
  }, [q]);
  useEffect(() => {
    if (tab === "mine" && !selected && !player) return;
    const refresh = () => {
      setData(null);
      setCreation(null);
      setOwn(null);
      if (document.visibilityState !== "hidden") setRevision((n) => n + 1);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [tab, selected, player]);
  useEffect(() => {
    let current = true;
    setData(null);
    setCreation(null);
    setOwn(null);
    setError("");
    setLoading(signedIn);
    if (!signedIn) return;
    void (async () => {
      try {
        if (selected) {
          const response = await api.request("creation", { id: selected });
          const c = parsePublicCreation(
            (response as { creation: unknown }).creation,
          );
          if (current) setCreation(c);
        } else if (tab === "mine" && !player) {
          const response = parseOwnCommunity(await api.request("mine"));
          if (current) setOwn(response);
        } else {
          const response = parseCommunityPage(
            await api.request(
              player ? "profile" : tab,
              player ? { id: player, page: galleryPage } : { q, page },
            ),
            !player && tab === "players",
          );
          if (current) setData(response);
        }
      } catch (e) {
        if (current)
          setError(
            e instanceof CommunityError
              ? e.message
              : "La communauté est momentanément indisponible. Réessayez.",
          );
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
    };
  }, [api, signedIn, tab, q, page, player, selected, galleryPage, revision]);
  useEffect(() => {
    if (loading || (!data && !creation && !own)) return;
    const p = positions.get(location.hash);
    if (!p) return;
    const frame = requestAnimationFrame(() => {
      const link = [
        ...document.querySelectorAll<HTMLAnchorElement>(".community a"),
      ].find((a) => a.getAttribute("href") === p.focus);
      link?.focus({ preventScroll: true });
      window.scrollTo({ top: p.y, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, data, creation, own]);
  async function mutate(
    action: Parameters<CommunityApi["request"]>[0],
    input: Record<string, unknown>,
    message: string,
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await api.request(action, input);
      if (
        !response ||
        typeof response !== "object" ||
        (action !== "save-profile" &&
          (!("ok" in response) || response.ok !== true))
      )
        throw new Error("Invalid mutation response");
      setNotice(message);
      if (action === "save-profile") setOwn(parseOwnCommunity(response));
      else if (action === "report") setReport(null);
      else setOwn(parseOwnCommunity(await api.request("mine")));
    } catch (e) {
      setError(
        e instanceof CommunityError
          ? e.message
          : "L’action n’a pas pu être confirmée. Actualisez avant de réessayer.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const profile = data?.profile;
  return (
    <section className="community free-mode" aria-label="Communauté Brigos">
      <div className="community-heading">
        <div>
          <span className="eyebrow">
            <Users size={15} />
            LA COMMUNAUTÉ BRIGOS
          </span>
          <h1>Galeries des joueurs</h1>
          <p>Des idées à découvrir, des créateurs à rencontrer.</p>
        </div>
        <a href="#sandbox" className="free-secondary">
          Ma galerie
          <ArrowRight size={16} />
        </a>
      </div>
      <nav className="free-tabs" aria-label="Vues de la communauté">
        <a
          href="#community"
          aria-current={
            tab === "creations" && !player && !selected ? "page" : undefined
          }
        >
          Créations
        </a>
        <a
          href="#community?tab=players"
          aria-current={
            tab === "players" && !player && !selected ? "page" : undefined
          }
        >
          Joueurs
        </a>
        <a
          href="#community?tab=mine"
          aria-current={
            tab === "mine" && !selected && !player ? "page" : undefined
          }
        >
          Mon profil
        </a>
      </nav>
      {notice && (
        <p className="community-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div className="community-notice free-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="free-secondary"
            disabled={busy}
            onClick={() => setRevision((n) => n + 1)}
          >
            Actualiser
          </button>
        </div>
      )}
      {!signedIn ? (
        <div className="free-empty">
          <Globe size={34} />
          <h2>Rejoignez les galeries</h2>
          <p>
            Connectez-vous pour découvrir les joueurs et partager vos créations.
            Votre partie invitée reste privée sur cet appareil.
          </p>
          {onOpenAccount && (
            <button
              type="button"
              className="free-primary"
              onClick={onOpenAccount}
            >
              Ouvrir mon compte
            </button>
          )}
        </div>
      ) : (
        <>
          {loading && (
            <p className="community-loading" role="status">
              Les galeries se préparent…
            </p>
          )}
          {creation && (
            <>
              <RememberLink
                href={href({ communityCreationId: undefined })}
                className="free-text-link"
              >
                <ArrowLeft size={16} />
                Retour {player ? "à la galerie" : "aux résultats"}
              </RememberLink>
              <article className="free-detail">
                <CreationArt creation={creation} />
                <div className="free-detail-copy">
                  <span className="eyebrow">CRÉATION PARTAGÉE</span>
                  <h2>{creation.title}</h2>
                  <p className="free-description">{creation.description}</p>
                  <RememberLink
                    className="community-author"
                    href={href({
                      communityPlayerId: creation.author.id,
                      communityCreationId: undefined,
                      communityGalleryPage: 1,
                    })}
                  >
                    <Avatar profile={creation.author} />
                    <span>
                      Par <strong>{creation.author.pseudo}</strong>
                      <small>Voir le profil et sa galerie</small>
                    </span>
                    <ArrowRight size={17} />
                  </RememberLink>
                  <p className="free-meta">
                    {creation.placements.length} Brigos · aperçu publié
                  </p>
                  <button
                    className="free-text-link"
                    type="button"
                    onClick={() =>
                      setReport({ id: creation.id, kind: "creation" })
                    }
                  >
                    <Flag size={15} />
                    Signaler cette création
                  </button>
                </div>
              </article>
            </>
          )}
          {profile && !creation && (
            <>
              <RememberLink href={rootHref} className="free-text-link">
                <ArrowLeft size={16} />
                Retour aux résultats
              </RememberLink>
              <div className="community-profile">
                <Avatar profile={profile} />
                <div>
                  <span className="eyebrow">PROFIL DE JOUEUR</span>
                  <h2>{profile.pseudo}</h2>
                  <p>
                    {profile.bio || "Ce joueur laisse parler ses créations."}
                  </p>
                  <span className="free-meta">
                    {profile.publishedCount} création
                    {profile.publishedCount === 1 ? "" : "s"} partagée
                    {profile.publishedCount === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  type="button"
                  className="free-text-link"
                  onClick={() => setReport({ id: profile.id, kind: "profile" })}
                >
                  <Flag size={15} />
                  Signaler
                </button>
              </div>
              {profile.featuredCreationId && (
                <RememberLink
                  className="community-featured-link free-secondary"
                  href={href({
                    communityCreationId: profile.featuredCreationId,
                  })}
                >
                  <Star size={17} />
                  Voir la création mise en avant
                  <ArrowRight size={16} />
                </RememberLink>
              )}
              <h2 className="community-section-title">
                La galerie de {profile.pseudo}
              </h2>
            </>
          )}
          {data && !creation && (
            <>
              {!player && (
                <form
                  className="community-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    location.hash = href({
                      communityQuery: query.trim(),
                      communityPage: 1,
                    });
                  }}
                >
                  <label htmlFor="community-search">
                    {tab === "players"
                      ? "Rechercher un joueur"
                      : "Rechercher une création ou un joueur"}
                  </label>
                  <div>
                    <input
                      id="community-search"
                      type="search"
                      maxLength={40}
                      value={query}
                      placeholder={
                        tab === "players"
                          ? "Un pseudo…"
                          : "Un titre, un pseudo…"
                      }
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="submit" className="free-primary">
                      <Search size={17} />
                      Rechercher
                    </button>
                  </div>
                </form>
              )}
              {!data.items.length && (
                <div className="free-empty">
                  <Frame size={32} />
                  <h2>
                    {q
                      ? "Aucun résultat"
                      : player
                        ? "Une galerie encore vide"
                        : tab === "players"
                          ? "Les premiers profils arrivent"
                          : "Les premières créations arrivent"}
                  </h2>
                  <p>
                    {q
                      ? "Essayez un autre pseudo ou un autre titre."
                      : player
                        ? "Ce joueur n’a pas de création partagée pour le moment."
                        : "Seuls les profils et les créations volontairement partagés apparaissent ici."}
                  </p>
                </div>
              )}
              <div
                className={
                  tab === "players" && !player
                    ? "community-players"
                    : "community-creations"
                }
              >
                {data.items.map((item) =>
                  "placements" in item ? (
                    <article className="community-creation-card" key={item.id}>
                      <RememberLink
                        href={href({ communityCreationId: item.id })}
                      >
                        <CreationArt creation={item} />
                        <div className="community-card-copy">
                          <h3>{item.title}</h3>
                          <p>{item.placements.length} Brigos assemblés</p>
                        </div>
                      </RememberLink>
                      <RememberLink
                        className="community-card-author"
                        href={href({
                          communityPlayerId: item.author.id,
                          communityCreationId: undefined,
                          communityGalleryPage: 1,
                        })}
                      >
                        {item.author.pseudo}
                        <ArrowRight size={15} />
                      </RememberLink>
                    </article>
                  ) : (
                    <RememberLink
                      className="community-player-card"
                      key={item.id}
                      href={href({
                        communityPlayerId: item.id,
                        communityGalleryPage: 1,
                      })}
                    >
                      <Avatar profile={item} />
                      <div>
                        <h2>{item.pseudo}</h2>
                        <p>{item.bio || "À découvrir dans sa galerie"}</p>
                        <span className="free-meta">
                          {item.publishedCount} création
                          {item.publishedCount === 1 ? "" : "s"} partagée
                          {item.publishedCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <ArrowRight size={17} />
                    </RememberLink>
                  ),
                )}
              </div>
              <Pager
                page={player ? galleryPage : page}
                hasMore={data.hasMore}
                href={(n) =>
                  href(
                    player ? { communityGalleryPage: n } : { communityPage: n },
                  )
                }
              />
            </>
          )}
          {own && !creation && (
            <>
              <ProfileForm
                own={own}
                busy={busy}
                onSave={(input) =>
                  mutate("save-profile", input, "Votre profil est enregistré.")
                }
              />
              <section className="community-publications">
                <h2>Mes publications</h2>
                <p className="free-help">
                  Publiez une copie de vos créations exposées dans votre galerie
                  personnelle. Les modifications du projet ne sont partagées
                  qu’après « Actualiser le partage ».
                </p>
                {!own.profile?.visible && (
                  <p className="community-notice">
                    Enregistrez un profil visible pour pouvoir publier. Vous
                    pouvez retirer un partage à tout moment.
                  </p>
                )}
                {!game.state.freeGallery?.exhibits.length && (
                  <div className="free-empty">
                    <p>
                      Exposez d’abord une création dans votre galerie
                      personnelle.
                    </p>
                    <a href="#sandbox" className="free-secondary">
                      Ouvrir ma galerie
                    </a>
                  </div>
                )}
                {game.state.freeGallery?.exhibits.map((exhibit) => {
                  const project = game.state.sandboxProjects?.find(
                    (p) => p.id === exhibit.projectId,
                  );
                  if (!project) return null;
                  const shared = own.creations.find(
                    (c) => c.projectId === project.id,
                  );
                  return (
                    <article className="community-publication" key={project.id}>
                      <div>
                        <h3>{project.name}</h3>
                        <p className="free-meta">
                          {shared?.moderated
                            ? "Masquée par la modération"
                            : shared
                              ? own.profile?.visible
                                ? "Partagée avec les joueurs"
                                : "Masquée avec votre profil"
                              : "Privée · vous seul la voyez"}
                        </p>
                      </div>
                      <div className="community-publication-actions">
                        <button
                          type="button"
                          className="free-primary"
                          disabled={
                            busy ||
                            game.busy ||
                            !game.ready ||
                            !own.profile?.visible ||
                            own.profile.moderated ||
                            shared?.moderated
                          }
                          onClick={() =>
                            void mutate(
                              "publish",
                              { projectId: project.id },
                              "La création est partagée avec les joueurs.",
                            )
                          }
                        >
                          {shared
                            ? "Actualiser le partage"
                            : "Publier cette création"}
                        </button>
                        {shared && (
                          <button
                            type="button"
                            className="free-secondary"
                            disabled={busy}
                            onClick={() =>
                              void mutate(
                                "unpublish",
                                { id: shared.id },
                                "Le partage est retiré. Votre projet est conservé.",
                              )
                            }
                          >
                            Retirer le partage
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {own.profile?.visible && !own.profile.moderated && (
                  <a
                    className="free-text-link"
                    href={`#community?player=${own.profile.id}`}
                  >
                    Voir mon profil public
                    <ArrowRight size={16} />
                  </a>
                )}
              </section>
            </>
          )}
        </>
      )}
      {report && (
        <Modal
          title="Signaler un contenu"
          eyebrow="COMMUNAUTÉ BRIGOS"
          onClose={() => {
            if (!lock.current) setReport(null);
          }}
        >
          <form
            className="community-report"
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(
                "report",
                { ...report, reason },
                "Votre signalement est transmis à la modération.",
              );
            }}
          >
            <p>
              Le signalement sera examiné. Il ne masque pas automatiquement le
              contenu.
            </p>
            <label>
              Motif
              <select
                disabled={busy}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="inappropriate">Contenu inapproprié</option>
                <option value="rights">
                  Respect des droits et créations originales
                </option>
                <option value="spam">Spam ou abus</option>
              </select>
            </label>
            {error && (
              <p role="alert" className="free-error">
                {error}
              </p>
            )}
            <div className="community-publication-actions">
              <button
                type="button"
                className="free-secondary"
                disabled={busy}
                onClick={() => setReport(null)}
              >
                Annuler
              </button>
              <button type="submit" className="free-primary" disabled={busy}>
                {busy ? "Envoi…" : "Envoyer le signalement"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

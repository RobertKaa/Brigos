import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Frame,
  Image,
  Plus,
  RotateCw,
  Star,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { FreeCreationPreview } from "../components/FreeCreationPreview";
import {
  emptyFreeGallery,
  GALLERY_DESCRIPTION_MAX,
  sandboxGeometryFingerprint,
} from "../game/freeGallery";
import type { ExhibitPresentation } from "../game/freeGallery";
import type { SandboxProject } from "../game/sandbox";
import { SANDBOX_MAX_PROJECTS } from "../game/sandbox";
import type { Game } from "./types";
import { Sandbox } from "./Sandbox";
import "./free-mode.css";

export const freeProjectHref = (
  id: string,
  view: "build" | "exhibit" = "build",
) => `#sandbox?view=${view}&project=${encodeURIComponent(id)}`;
const brigoLabel = (count: number) => `${count} Brigo${count === 1 ? "" : "s"}`;

function ExhibitionForm({
  project,
  presentation,
  game,
  onClose,
  onSaved,
}: {
  project: SandboxProject;
  presentation?: ExhibitPresentation;
  game: Game;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [draft, setDraft] = useState<ExhibitPresentation>(() => ({
    description: presentation?.description ?? "",
    rotation: presentation?.rotation ?? 0,
    backgroundId: presentation?.backgroundId ?? "paper",
  }));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const titleInput = useRef<HTMLInputElement>(null);
  const locked = pending || game.busy || !game.ready;
  useEffect(() => {
    const frame = requestAnimationFrame(() => titleInput.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  async function save() {
    if (sending.current || locked || !name.trim()) return;
    sending.current = true;
    setPending(true);
    setError("");
    try {
      const response = await game.act(
        { type: "expose-project", projectId: project.id, name, ...draft },
        "Présentation enregistrée dans votre galerie.",
      );
      if (response) onSaved();
      else
        setError(
          "La présentation n’a pas pu être enregistrée. Vos champs sont conservés ; réessayez.",
        );
    } catch {
      setError(
        "La présentation n’a pas pu être enregistrée. Vos champs sont conservés ; réessayez.",
      );
    } finally {
      sending.current = false;
      setPending(false);
    }
  }
  return (
    <Modal
      title="Présenter votre création"
      eyebrow="VOTRE GALERIE PERSONNELLE"
      wide
      className="free-exhibition-modal"
      onClose={() => {
        if (!sending.current) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="free-form-content">
          <div>
            <FreeCreationPreview
              project={project}
              rotation={draft.rotation}
              backgroundId={draft.backgroundId}
            />
            <button
              type="button"
              className="free-secondary"
              disabled={locked}
              onClick={() =>
                setDraft({
                  ...draft,
                  rotation: ((draft.rotation + 90) %
                    360) as ExhibitPresentation["rotation"],
                })
              }
            >
              <RotateCw size={16} aria-hidden="true" />
              Angle {draft.rotation}°
            </button>
          </div>
          <div className="free-fields">
            <label>
              Titre de la création
              <input
                ref={titleInput}
                required
                maxLength={48}
                value={name}
                disabled={locked}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Description{" "}
              <span className="free-meta">facultative · 240 caractères</span>
              <textarea
                maxLength={GALLERY_DESCRIPTION_MAX}
                rows={3}
                value={draft.description}
                disabled={locked}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </label>
            <label>
              Fond
              <select
                value={draft.backgroundId}
                disabled={locked}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    backgroundId: event.target
                      .value as ExhibitPresentation["backgroundId"],
                  })
                }
              >
                <option value="paper">Papier</option>
                <option value="ink">Nuit d’encre</option>
              </select>
            </label>
            <p className="free-help">
              Cette présentation reste dans votre galerie personnelle. Vos
              Brigos restent réservés dans le projet.
            </p>
            {error && (
              <p className="free-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="free-form-actions">
          <button
            type="button"
            className="free-secondary"
            disabled={locked}
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="free-primary"
            disabled={locked || !name.trim()}
          >
            <Check size={17} aria-hidden="true" />
            {pending ? "Enregistrement…" : "Enregistrer l’exposition"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function FreeMode({
  game,
  view,
  projectId,
}: {
  game: Game;
  view?: "build" | "exhibit";
  projectId?: string;
}) {
  const projects = game.state.sandboxProjects ?? [];
  const gallery = game.state.freeGallery ?? emptyFreeGallery();
  const missingProject =
    !!projectId &&
    game.ready &&
    !projects.some((project) => project.id === projectId);
  const building = view === "build" && !missingProject;
  const [draftId, setDraftId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const locked = !game.ready || game.busy || pending;
  const heading = useRef<HTMLHeadingElement>(null);
  const draftProject = projects.find((project) => project.id === draftId);
  const selected =
    view === "exhibit"
      ? projects.find((project) => project.id === projectId)
      : undefined;
  const exhibit = selected
    ? gallery.exhibits.find((item) => item.projectId === selected.id)
    : undefined;
  const featured = projects.find(
    (project) => project.id === gallery.featuredProjectId,
  );
  const featurePresentation = gallery.exhibits.find(
    (item) => item.projectId === featured?.id,
  );
  const stale =
    selected &&
    exhibit &&
    sandboxGeometryFingerprint(selected) !== exhibit.confirmedGeometry;
  const lastLocation = useRef({ view, projectId });
  useEffect(() => {
    if (
      lastLocation.current.view !== view ||
      lastLocation.current.projectId !== projectId
    ) {
      lastLocation.current = { view, projectId };
      heading.current?.focus({ preventScroll: true });
    }
  }, [view, projectId]);
  async function action(run: () => Promise<unknown>) {
    if (inFlight.current || locked) return;
    inFlight.current = true;
    setPending(true);
    try {
      await run();
    } catch {
      game.notify("L’action n’a pas pu être enregistrée. Réessayez.", "error");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  async function create() {
    await action(async () => {
      const response = await game.act(
        { type: "create-project" },
        "Votre nouvel espace de création est prêt.",
      );
      const id = response?.result.projectId;
      if (typeof id === "string") window.location.hash = freeProjectHref(id);
    });
  }
  return (
    <div className="free-mode">
      <nav className="free-tabs" aria-label="Vues du mode Libre">
        <a href="#sandbox" aria-current={!building ? "page" : undefined}>
          Ma galerie
        </a>
        <a
          href={
            projectId && view === "build"
              ? freeProjectHref(projectId)
              : "#sandbox?view=build"
          }
          aria-current={building ? "page" : undefined}
        >
          Construire
        </a>
        <a href="#community">Galeries</a>
      </nav>
      {building ? (
        <>
          <Sandbox
            key={projectId ?? "continue"}
            game={game}
            initialProjectId={projectId}
            onExpose={setDraftId}
            titleRef={heading}
            onProjectChanged={(id) => {
              window.location.hash = freeProjectHref(id);
            }}
            onProjectDeleted={() => {
              window.location.hash = "#sandbox";
            }}
          />
        </>
      ) : selected && exhibit ? (
        <>
          <a href="#sandbox" className="free-text-link">
            <ArrowLeft size={17} aria-hidden="true" />
            Ma galerie
          </a>
          <section className="free-detail">
            <FreeCreationPreview
              project={selected}
              rotation={exhibit.rotation}
              backgroundId={exhibit.backgroundId}
            />
            <div className="free-detail-copy">
              <span className="eyebrow">
                GALERIE PERSONNELLE
                {gallery.featuredProjectId === selected.id
                  ? " · EN VEDETTE"
                  : ""}
              </span>
              <h1 ref={heading} tabIndex={-1}>
                {selected.name}
              </h1>
              {exhibit.description && (
                <p className="free-description">{exhibit.description}</p>
              )}
              <span className="free-meta">
                {brigoLabel(selected.placements.length)} réservé
                {selected.placements.length === 1 ? "" : "s"} dans ce projet
              </span>
              {stale && (
                <p className="free-update" role="status">
                  Cette création a changé depuis sa dernière exposition.
                  Actualisez sa présentation.
                </p>
              )}
              <a className="free-primary" href={freeProjectHref(selected.id)}>
                Reprendre la construction
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              <div className="free-detail-actions">
                <a className="free-secondary" href="#community?tab=mine">
                  Partager avec les joueurs
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  className="free-secondary"
                  disabled={locked}
                  onClick={() => setDraftId(selected.id)}
                >
                  <Frame size={16} aria-hidden="true" />
                  {stale ? "Actualiser l’exposition" : "Présentation"}
                </button>
                <button
                  type="button"
                  className="free-secondary"
                  disabled={locked}
                  onClick={() =>
                    void action(async () => {
                      await game.act(
                        {
                          type: "feature-exhibit",
                          projectId:
                            gallery.featuredProjectId === selected.id
                              ? null
                              : selected.id,
                        },
                        gallery.featuredProjectId === selected.id
                          ? "Vedette retirée."
                          : "Création mise en vedette.",
                      );
                    })
                  }
                >
                  <Star size={16} aria-hidden="true" />
                  {gallery.featuredProjectId === selected.id
                    ? "Retirer la vedette"
                    : "Mettre en vedette"}
                </button>
              </div>
              <button
                type="button"
                className="free-text-link"
                disabled={locked}
                onClick={() =>
                  void action(async () => {
                    if (
                      await game.act(
                        { type: "remove-exhibit", projectId: selected.id },
                        "Exposition retirée. Le projet et ses Brigos sont conservés.",
                      )
                    )
                      window.location.hash = "#sandbox";
                  })
                }
              >
                Retirer de la galerie
              </button>
            </div>
          </section>
        </>
      ) : (
        <>
          {missingProject && (
            <p className="free-help" role="status">
              Ce projet n’est plus disponible. Retrouvez vos autres créations
              dans la galerie.
            </p>
          )}
          <div className="free-heading">
            <div>
              <span className="eyebrow">VOTRE ESPACE DE CRÉATION</span>
              <h1 ref={heading} tabIndex={-1}>
                Ma galerie
              </h1>
              <p>Construisez à votre idée. Donnez une place à vos créations.</p>
            </div>
            <button
              className="free-primary"
              type="button"
              disabled={locked || projects.length >= SANDBOX_MAX_PROJECTS}
              onClick={() => void create()}
            >
              <Plus size={17} aria-hidden="true" />
              Nouvelle création
            </button>
          </div>
          {projects.length >= SANDBOX_MAX_PROJECTS && (
            <p className="free-help">
              Vos 20 emplacements sont occupés. Reprenez une création ou
              démontez un projet pour en commencer un autre.
            </p>
          )}
          {!game.ready ? (
            <p role="status" className="free-empty">
              Chargement de vos créations…
            </p>
          ) : (
            <>
              {!gallery.exhibits.length && (
                <section className="free-empty">
                  <Image size={36} aria-hidden="true" />
                  <h2>Votre première création mérite sa place ici.</h2>
                  <p>
                    {projects.length
                      ? "Retrouvez vos projets ci-dessous et exposez celui de votre choix."
                      : "Commencez un projet avec les Brigos de votre stock, puis choisissez son angle et son fond."}
                  </p>
                  {!projects.length && (
                    <button
                      type="button"
                      className="free-primary"
                      disabled={locked}
                      onClick={() => void create()}
                    >
                      Créer ma première construction
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </button>
                  )}
                  {!Object.keys(game.state.inventory).length &&
                    !projects.length && (
                      <a href="#boxes" className="free-text-link">
                        Trouver des Brigos dans les boîtes
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </a>
                    )}
                </section>
              )}
              {featured && featurePresentation && (
                <section className="free-featured">
                  <FreeCreationPreview
                    project={featured}
                    rotation={featurePresentation.rotation}
                    backgroundId={featurePresentation.backgroundId}
                  />
                  <div>
                    <span className="eyebrow">
                      <Star size={14} aria-hidden="true" />
                      EN VEDETTE
                    </span>
                    <h2>{featured.name}</h2>
                    {featurePresentation.description && (
                      <p className="free-description">
                        {featurePresentation.description}
                      </p>
                    )}
                    <span className="free-meta">
                      {brigoLabel(featured.placements.length)} · Galerie
                      personnelle
                    </span>
                    <a
                      className="free-primary"
                      href={freeProjectHref(featured.id, "exhibit")}
                    >
                      Contempler
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </a>
                  </div>
                </section>
              )}
              {projects.length > 0 && (
                <>
                  <div className="free-section-heading">
                    <h2>
                      Vos créations{" "}
                      <span className="free-meta">
                        {projects.length} / {SANDBOX_MAX_PROJECTS}
                      </span>
                    </h2>
                    <span className="free-meta">
                      {gallery.exhibits.length} exposée
                      {gallery.exhibits.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="free-grid">
                    {projects.map((project) => {
                      const presentation = gallery.exhibits.find(
                        (item) => item.projectId === project.id,
                      );
                      const outdated =
                        presentation &&
                        sandboxGeometryFingerprint(project) !==
                          presentation.confirmedGeometry;
                      return (
                        <article className="free-card" key={project.id}>
                          <FreeCreationPreview
                            project={project}
                            rotation={presentation?.rotation}
                            backgroundId={presentation?.backgroundId}
                          />
                          <div className="free-card-copy">
                            <span className="free-meta">
                              {brigoLabel(project.placements.length)} ·{" "}
                              {presentation
                                ? outdated
                                  ? "À actualiser"
                                  : "Exposée"
                                : project.placements.length
                                  ? "À exposer"
                                  : "Projet vide"}
                            </span>
                            <h3>{project.name}</h3>
                            <div className="free-card-actions">
                              {presentation ? (
                                <a
                                  className="free-secondary"
                                  href={freeProjectHref(project.id, "exhibit")}
                                >
                                  Voir la création
                                  <ArrowUpRight size={16} aria-hidden="true" />
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  className="free-secondary"
                                  disabled={
                                    locked || !project.placements.length
                                  }
                                  onClick={() => setDraftId(project.id)}
                                >
                                  <Plus size={16} aria-hidden="true" />
                                  Exposer
                                </button>
                              )}
                              <a
                                className="free-text-link"
                                href={freeProjectHref(project.id)}
                              >
                                Reprendre
                                <ArrowUpRight size={16} aria-hidden="true" />
                              </a>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
      {draftProject && (
        <ExhibitionForm
          key={draftProject.id}
          project={draftProject}
          presentation={gallery.exhibits.find(
            (item) => item.projectId === draftProject.id,
          )}
          game={game}
          onClose={() => setDraftId(null)}
          onSaved={() => {
            setDraftId(null);
            window.location.hash = freeProjectHref(draftProject.id, "exhibit");
          }}
        />
      )}
    </div>
  );
}

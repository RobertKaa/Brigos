/** Design prototype. All examples and changes stay in React memory. */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Frame,
  Image,
  Moon,
  Plus,
  RotateCw,
  Sparkles,
  Star,
  Sun,
  X,
} from "lucide-react";
import { BrigoLogo } from "../src/components/BrigoLogo";
import { prepareSandboxDrawing } from "../src/components/SandboxScene";
import { BRIGO_BY_ID } from "../src/game/catalog";
import { rotatedSize } from "../src/game/geometry";
import type { Rotation } from "../src/game/geometry";
import { sandboxPlacementIssue } from "../src/game/sandbox";
import type { SandboxPlacement } from "../src/game/sandbox";
import { applyTheme } from "../src/theme";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "../src/styles.css";
import "../src/accessibility.css";
import "../src/studio-theme.css";
import "./review-free-gallery.css";

if (!import.meta.env.DEV)
  throw new Error("Maquette réservée au développement.");

type Backdrop = "paper" | "ink" | "aurora";
type DemoProject = {
  id: string;
  name: string;
  description: string;
  placements: SandboxPlacement[];
  rotation: Rotation;
  backdrop: Backdrop;
};
const p = (
  id: string,
  brigoId: string,
  x: number,
  y: number,
  z: number,
): SandboxPlacement => ({ id, brigoId, x, y, z, rotation: 0 });
const projects: DemoProject[] = [
  {
    id: "belvedere",
    name: "Le petit belvédère",
    description:
      "Un abri corail posé au bord du jardin. Un endroit pour imaginer la suite.",
    rotation: 0,
    backdrop: "paper",
    placements: [
      p("a", "plate-4x4:ivory", 10, 10, 0),
      p("b", "brick-2x2:coral", 10, 10, 1),
      p("c", "brick-2x2:coral", 12, 10, 1),
      p("d", "slope-2x2:coral", 10, 10, 4),
      p("e", "slope-2x2:coral", 12, 10, 4),
      p("f", "round-2x2:green", 10, 12, 1),
    ],
  },
  {
    id: "signal",
    name: "Le signal bleu",
    description: "Quelques volumes, un sommet doré et beaucoup d’horizon.",
    rotation: 0,
    backdrop: "ink",
    placements: [
      p("a", "plate-4x4:ivory", 10, 10, 0),
      p("b", "brick-2x2:blue", 11, 11, 1),
      p("c", "brick-2x2:blue", 11, 11, 4),
      p("d", "brick-2x2:blue", 11, 11, 7),
      p("e", "brick-1x1:yellow", 11, 11, 10),
    ],
  },
];
// Keep the sketches within the existing shapes and placement rules.
for (const project of projects)
  for (let index = 0; index < project.placements.length; index++) {
    const issue = sandboxPlacementIssue(
      project.placements.slice(0, index),
      project.placements[index],
    );
    if (issue) throw new Error(`Projet de maquette invalide : ${issue}`);
  }
const challengeTitles = [
  "Petit monde",
  "Jardin de couleurs",
  "Signal dans le ciel",
];
const rewards = [
  "Socle Sable · badge Miniaturiste",
  "Fond Aurore · badge Coloriste",
  "Cadre Encre · badge Architecte des hauteurs",
];
const challengeDetails = [
  "2 à 12 Brigos · emprise ≤ 6 × 6 · hauteur ≤ 12",
  "Au moins 3 Brigos · au moins 2 couleurs",
  "3 à 30 Brigos · emprise ≤ 8 × 8 · hauteur ≥ 9",
];
// Preview only: no game command, reward ledger or persistence is attached.
const demoChallenges: Record<string, boolean[]> = Object.fromEntries(
  projects.map((project) => {
    const boxes = project.placements.map((piece) => {
      const brigo = BRIGO_BY_ID.get(piece.brigoId)!;
      const size = rotatedSize(brigo.model, piece.rotation);
      return {
        ...piece,
        width: size.width,
        depth: size.depth,
        height: brigo.model.height,
        color: brigo.color.id,
      };
    });
    const width =
      Math.max(...boxes.map((b) => b.x + b.width)) -
      Math.min(...boxes.map((b) => b.x));
    const depth =
      Math.max(...boxes.map((b) => b.y + b.depth)) -
      Math.min(...boxes.map((b) => b.y));
    const height =
      Math.max(...boxes.map((b) => b.z + b.height)) -
      Math.min(...boxes.map((b) => b.z));
    const count = boxes.length;
    return [
      project.id,
      [
        count >= 2 && count <= 12 && width <= 6 && depth <= 6 && height <= 12,
        count >= 3 && new Set(boxes.map((b) => b.color)).size >= 2,
        count >= 3 && count <= 30 && width <= 8 && depth <= 8 && height >= 9,
      ],
    ];
  }),
);

function ModelArt({ project }: { project: DemoProject }) {
  const layers = useMemo(
    () => prepareSandboxDrawing(project.placements, project.rotation),
    [project.placements, project.rotation],
  );
  const bounds = layers.map((layer) => layer.projectedBounds);
  const left = Math.min(...bounds.map((b) => b.minX)) - 30;
  const right = Math.max(...bounds.map((b) => b.maxX)) + 30;
  const top = Math.min(...bounds.map((b) => b.minY)) - 28;
  const bottom = Math.max(...bounds.map((b) => b.maxY)) + 22;
  return (
    <div className={`fg-art fg-art-${project.backdrop}`}>
      <svg
        viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
        role="img"
        aria-label={`${project.name}, ${project.placements.length} Brigos, angle ${project.rotation} degrés`}
      >
        {layers.map((layer) => (
          <g
            key={layer.placement.id}
            transform={`translate(${layer.offset.x} ${layer.offset.y})`}
            strokeWidth="1.1"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            {layer.mesh.primitives.map((primitive, index) => (
              <Fragment key={index}>
                <path
                  d={primitive.d}
                  fill={primitive.fill}
                  stroke={primitive.stroke}
                  opacity={primitive.opacity}
                />
                {primitive.hatching && (
                  <path
                    d={primitive.hatching}
                    fill="none"
                    stroke="#293146"
                    strokeWidth=".6"
                    opacity=".32"
                  />
                )}
              </Fragment>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

function GalleryPrototype() {
  const [tab, setTab] = useState<"gallery" | "build" | "challenges">("gallery");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [exhibits, setExhibits] = useState<DemoProject[]>([projects[0]]);
  const [featured, setFeatured] = useState<string | null>(projects[0].id);
  const [detail, setDetail] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState(projects[0].id);
  const [unlocked, setUnlocked] = useState<number[]>([]);
  const [draft, setDraft] = useState<DemoProject | null>(null);
  const [notice, setNotice] = useState("");
  const [editFromDetail, setEditFromDetail] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const detailTrigger = useRef<string | null>(null);
  const draftTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    if (draft && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
      dialog.current.querySelector("input")?.focus();
    }
  }, [draft]);
  const current = exhibits.find((item) => item.id === detail);
  const hero = exhibits.find((item) => item.id === featured);
  const activeProject = projects.find((item) => item.id === selectedProject)!;
  function navigate(next: typeof tab) {
    setTab(next);
    setDetail(null);
  }
  function openDraft(project: DemoProject) {
    draftTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDraft({ ...project });
  }
  function closeDraft() {
    dialog.current?.close();
    setDraft(null);
    draftTrigger.current?.focus();
  }
  function saveDraft() {
    if (!draft || !draft.name.trim()) return;
    const saved = { ...draft, name: draft.name.trim() };
    const added = demoChallenges[saved.id].flatMap((passed, index) =>
      passed && !unlocked.includes(index) ? [index] : [],
    );
    setExhibits((items) => [
      ...items.filter((item) => item.id !== saved.id),
      saved,
    ]);
    setUnlocked((items) => [...new Set([...items, ...added])]);
    closeDraft();
    setDetail(saved.id);
    setTab("gallery");
    setNotice(
      added.length
        ? `Présentation enregistrée. ${added.length} défi${added.length > 1 ? "s" : ""} validé${added.length > 1 ? "s" : ""} dans la maquette.`
        : "Présentation enregistrée dans la maquette.",
    );
    requestAnimationFrame(() => heading.current?.focus());
  }
  function openDetail(project: DemoProject, trigger: HTMLButtonElement) {
    detailTrigger.current = trigger.id;
    setDetail(project.id);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function returnToGallery() {
    setDetail(null);
    requestAnimationFrame(() =>
      (
        document.getElementById(detailTrigger.current ?? "") ??
        document.getElementById("fg-gallery-title")
      )?.focus(),
    );
  }
  return (
    <div className="fg-shell">
      <div className="fg-review-note">
        MAQUETTE DE CONCEPTION · V1 + V1.1 · Données fictives en mémoire
      </div>
      <header className="fg-header">
        <BrigoLogo />
        <span>
          Libre <span aria-hidden="true">/</span> Ma galerie
        </span>
        <button
          className="fg-icon"
          aria-label={
            theme === "light" ? "Activer le mode nuit" : "Activer le mode jour"
          }
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
        </button>
      </header>
      <main className="fg-main">
        <div className="fg-page-heading">
          <div>
            <p className="fg-eyebrow">Votre espace de création</p>
            <h1>Libre</h1>
          </div>
          <p>
            Construisez à votre idée. <br />
            Donnez une place à vos créations.
          </p>
        </div>
        <nav className="fg-tabs" aria-label="Vues du mode Libre">
          {(
            [
              ["build", "Construire"],
              ["gallery", "Ma galerie"],
              ["challenges", "Défis"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <p role="status" className="fg-notice">
          {notice}
        </p>
        {tab === "gallery" && !current && (
          <>
            <div className="fg-section-heading">
              <div>
                <p className="fg-eyebrow">La collection de vos idées</p>
                <h2 id="fg-gallery-title" tabIndex={-1}>
                  Ma galerie <span className="fg-count">{exhibits.length}</span>
                </h2>
              </div>
              <button
                className="fg-primary"
                onClick={() => {
                  setTab("build");
                  setNotice("Choisissez une création à exposer.");
                }}
              >
                <Plus size={17} />
                Exposer une création
              </button>
            </div>
            {!exhibits.length ? (
              <section className="fg-empty">
                <Image size={40} aria-hidden="true" />
                <h3>Votre première création mérite sa place ici.</h3>
                <p>
                  Choisissez un projet, un angle et un fond.
                  <br />
                  Vos Brigos restent dans votre construction.
                </p>
                <button className="fg-primary" onClick={() => setTab("build")}>
                  Choisir une création
                  <ArrowUpRight size={17} />
                </button>
              </section>
            ) : (
              <>
                {hero && (
                  <section className="fg-featured">
                    <ModelArt project={hero} />
                    <div className="fg-featured-copy">
                      <p className="fg-eyebrow">
                        <Star size={14} />
                        En vedette
                      </p>
                      <h3>{hero.name}</h3>
                      <p>{hero.description}</p>
                      <span className="fg-meta">
                        {hero.placements.length} Brigos · Galerie personnelle
                      </span>
                      <button
                        id="fg-featured-open"
                        className="fg-primary"
                        onClick={(event) =>
                          openDetail(hero, event.currentTarget)
                        }
                      >
                        Contempler
                        <ArrowUpRight size={17} />
                      </button>
                    </div>
                  </section>
                )}
                <div className="fg-grid">
                  {exhibits.map((project) => (
                    <article className="fg-card" key={project.id}>
                      <ModelArt project={project} />
                      <div>
                        <span className="fg-meta">
                          {project.placements.length} Brigos
                          {featured === project.id ? " · En vedette" : ""}
                        </span>
                        <h3>{project.name}</h3>
                        <button
                          id={`fg-open-${project.id}`}
                          className="fg-secondary"
                          onClick={(event) =>
                            openDetail(project, event.currentTarget)
                          }
                        >
                          Voir la création
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                  {projects
                    .filter(
                      (project) =>
                        !exhibits.some((item) => item.id === project.id),
                    )
                    .map((project) => (
                      <article
                        className="fg-card fg-draft-card"
                        key={project.id}
                      >
                        <ModelArt project={project} />
                        <div>
                          <span className="fg-meta">
                            En construction · {project.placements.length} Brigos
                          </span>
                          <h3>{project.name}</h3>
                          <button
                            className="fg-secondary"
                            onClick={() => openDraft(project)}
                          >
                            <Plus size={16} />
                            Exposer
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
              </>
            )}
            <aside className="fg-invitation">
              <Sparkles size={22} aria-hidden="true" />
              <div>
                <h3>Une contrainte, une nouvelle idée.</h3>
                <p>
                  Les défis créatifs débloquent des décors pour votre galerie.
                </p>
              </div>
              <button
                className="fg-secondary"
                onClick={() => setTab("challenges")}
              >
                Explorer les défis
                <ArrowUpRight size={16} />
              </button>
            </aside>
          </>
        )}
        {tab === "gallery" && current && (
          <>
            <button className="fg-text-button" onClick={returnToGallery}>
              <ArrowLeft size={17} />
              Ma galerie
            </button>
            <section className="fg-detail">
              <ModelArt project={current} />
              <div>
                <p className="fg-eyebrow">
                  Galerie personnelle
                  {featured === current.id ? " · En vedette" : ""}
                </p>
                <h2 ref={heading} tabIndex={-1}>
                  {current.name}
                </h2>
                <p>{current.description}</p>
                <span className="fg-meta">
                  {current.placements.length} Brigos réservés dans ce projet
                </span>
                <button
                  className="fg-primary"
                  onClick={() => {
                    setSelectedProject(current.id);
                    setDetail(null);
                    setTab("build");
                    setEditFromDetail(true);
                  }}
                >
                  Reprendre la construction
                  <ArrowUpRight size={17} />
                </button>
                <div className="fg-detail-actions">
                  <button
                    className="fg-secondary"
                    onClick={() => openDraft(current)}
                  >
                    <Frame size={16} />
                    Présentation
                  </button>
                  <button
                    className="fg-secondary"
                    onClick={() => {
                      setFeatured(featured === current.id ? null : current.id);
                      setNotice(
                        featured === current.id
                          ? "Vedette retirée."
                          : "Création mise en vedette.",
                      );
                    }}
                  >
                    <Star size={16} />
                    {featured === current.id
                      ? "Retirer la vedette"
                      : "Mettre en vedette"}
                  </button>
                </div>
                <button
                  className="fg-text-button"
                  onClick={() => {
                    setExhibits((items) =>
                      items.filter((item) => item.id !== current.id),
                    );
                    if (featured === current.id) setFeatured(null);
                    setDetail(null);
                    setNotice(
                      "Exposition retirée. Le projet et ses Brigos sont conservés.",
                    );
                  }}
                >
                  Retirer de la galerie
                </button>
              </div>
            </section>
          </>
        )}
        {tab === "build" && (
          <>
            <div className="fg-section-heading">
              <div>
                <p className="fg-eyebrow">Du projet à l’exposition</p>
                <h2>Vos constructions</h2>
              </div>
            </div>
            {editFromDetail && (
              <p className="fg-help">
                Dans le jeu, ce bouton retrouvera le projet dans l’éditeur
                actuel. Ici, seul le choix de présentation est simulé.
              </p>
            )}
            <div className="fg-grid">
              {projects.map((project) => {
                const exposed = exhibits.find((item) => item.id === project.id);
                return (
                  <article
                    className={`fg-card ${selectedProject === project.id ? "fg-selected" : ""}`}
                    key={project.id}
                  >
                    <ModelArt project={exposed ?? project} />
                    <div>
                      <span className="fg-meta">
                        {project.placements.length} Brigos ·{" "}
                        {exposed ? "Exposée" : "En construction"}
                      </span>
                      <h3>{exposed?.name ?? project.name}</h3>
                      <p>{project.description}</p>
                      <button
                        className="fg-primary"
                        onClick={() => {
                          setSelectedProject(project.id);
                          openDraft(exposed ?? project);
                        }}
                      >
                        {exposed ? "Actualiser la présentation" : "Exposer"}
                        <ArrowUpRight size={17} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="fg-help">
              Les créations restent modifiables. Exposer ne consomme aucun Brigo
              supplémentaire.
            </p>
          </>
        )}
        {tab === "challenges" && (
          <>
            <div className="fg-section-heading">
              <div>
                <p className="fg-eyebrow">À votre rythme</p>
                <h2>Défis créatifs</h2>
              </div>
              <span className="fg-meta">{unlocked.length} / 3 débloqués</span>
            </div>
            <p className="fg-help">
              Inspirez-vous du thème. Seuls les critères affichés sont vérifiés.
              Chaque récompense se débloque une fois, sans limite de temps.
            </p>
            <label className="fg-project-select">
              Voir les critères pour
              <select
                value={selectedProject}
                onChange={(event) => setSelectedProject(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="fg-challenges">
              {challengeTitles.map((title, index) => (
                <article className="fg-challenge" key={title}>
                  <span className="fg-challenge-number">0{index + 1}</span>
                  <div>
                    <span className="fg-eyebrow">
                      {unlocked.includes(index)
                        ? "Débloqué"
                        : demoChallenges[selectedProject][index]
                          ? "Critères remplis"
                          : "À construire"}
                    </span>
                    <h3>{title}</h3>
                    <p>{challengeDetails[index]}</p>
                    <span className="fg-reward">
                      <Sparkles size={15} />
                      {rewards[index]}
                    </span>
                  </div>
                  {unlocked.includes(index) ? (
                    <span className="fg-unlocked">
                      <Check size={18} />
                      Acquis
                    </span>
                  ) : (
                    <button
                      className="fg-secondary"
                      onClick={() =>
                        demoChallenges[selectedProject][index]
                          ? openDraft(
                              exhibits.find(
                                (item) => item.id === selectedProject,
                              ) ?? activeProject,
                            )
                          : (setTab("build"), setEditFromDetail(true))
                      }
                    >
                      {demoChallenges[selectedProject][index]
                        ? "Exposer pour valider"
                        : "Reprendre"}
                      <ArrowUpRight size={16} />
                    </button>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
        <footer className="fg-review-controls">
          <p>Conception du mode Libre · Galerie privée · Défis cosmétiques</p>
          <button
            className="fg-text-button"
            onClick={() => {
              setExhibits([]);
              setFeatured(null);
              setDetail(null);
              setTab("gallery");
              setNotice("État vide de la galerie.");
            }}
          >
            Voir la galerie vide
          </button>
          <button
            className="fg-text-button"
            onClick={() => {
              setExhibits([projects[0]]);
              setFeatured(projects[0].id);
              setUnlocked([]);
              setDetail(null);
              setTab("gallery");
              setNotice("Maquette réinitialisée.");
            }}
          >
            Réinitialiser la maquette
          </button>
        </footer>
      </main>
      <dialog
        ref={dialog}
        className="fg-dialog"
        aria-labelledby="fg-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          closeDraft();
        }}
      >
        {draft && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveDraft();
            }}
          >
            <div className="fg-dialog-heading">
              <div>
                <p className="fg-eyebrow">Votre galerie personnelle</p>
                <h2 id="fg-dialog-title">Présenter votre création</h2>
              </div>
              <button
                type="button"
                className="fg-icon"
                aria-label="Fermer la présentation"
                onClick={closeDraft}
              >
                <X size={20} />
              </button>
            </div>
            <div className="fg-dialog-content">
              <div className="fg-dialog-preview">
                <ModelArt project={draft} />
                <button
                  type="button"
                  className="fg-secondary"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      rotation: ((draft.rotation + 90) % 360) as Rotation,
                    })
                  }
                >
                  <RotateCw size={16} />
                  Angle {draft.rotation}°
                </button>
              </div>
              <div className="fg-fields">
                <label>
                  Titre de la création
                  <input
                    autoFocus
                    required
                    maxLength={48}
                    value={draft.name}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                  />
                </label>
                <label>
                  Description{" "}
                  <span className="fg-meta">facultative · 240 caractères</span>
                  <textarea
                    maxLength={240}
                    rows={3}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                  />
                </label>
                <label>
                  Fond
                  <select
                    value={draft.backdrop}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        backdrop: event.target.value as Backdrop,
                      })
                    }
                  >
                    <option value="paper">Papier</option>
                    <option value="ink">Nuit d’encre</option>
                    {unlocked.includes(1) && (
                      <option value="aurora">Aurore · débloqué</option>
                    )}
                  </select>
                </label>
                <p className="fg-help">
                  Cette présentation reste dans votre galerie personnelle. Votre
                  stock ne change pas.
                </p>
              </div>
            </div>
            <div className="fg-dialog-footer">
              <button
                type="button"
                className="fg-secondary"
                onClick={closeDraft}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="fg-primary"
                disabled={!draft.name.trim()}
              >
                <Check size={17} />
                Enregistrer l’exposition
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
const galleryRoot = createRoot(document.getElementById("root")!);
galleryRoot.render(<GalleryPrototype />);
if (import.meta.hot) import.meta.hot.dispose(() => galleryRoot.unmount());

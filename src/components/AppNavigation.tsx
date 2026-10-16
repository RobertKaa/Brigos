import { Box, Hammer, Layers3, NotebookPen, Orbit } from "lucide-react";
import type { View } from "../navigation";

const destinations = [
  { id: "boxes", label: "Boîtes", icon: Box },
  { id: "workshop", label: "Atelier", icon: Hammer },
  { id: "sandbox", label: "Libre", icon: Orbit },
  { id: "collection", label: "Collection", icon: Layers3 },
  { id: "journal", label: "Quêtes", icon: NotebookPen },
] as const;

export function AppNavigation({ view }: { view: View }) {
  return (
    <nav className="main-nav journey-nav" aria-label="Navigation principale">
      {destinations.map(({ id, label, icon: Icon }) => (
        <a
          key={id}
          href={`#${id}`}
          className={view === id ? "active" : ""}
          aria-current={view === id ? "page" : undefined}
        >
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

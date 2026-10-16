import { FAMILY_NAMES } from "./catalog";
import type { Brigo } from "./catalog";

export const normalizeSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s*[×x*]\s*/g, "x")
    .replace(/\s+/g, " ")
    .trim();
export function matchesSearch(brigo: Brigo, query: string): boolean {
  return normalizeSearch(
    `${brigo.name} ${FAMILY_NAMES[brigo.model.family]} #${String(brigo.number).padStart(3, "0")} ${brigo.id}`,
  ).includes(normalizeSearch(query));
}

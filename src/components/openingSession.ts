export const CHEST_ANIMATION_MS = 2800;

export interface RevealSession {
  id: string;
  phase: "unsealing" | "cards";
  revealed: number[];
  cascading: boolean;
}

export function createRevealSession(
  id: string,
  reducedMotion: boolean,
): RevealSession {
  return {
    id,
    phase: reducedMotion ? "cards" : "unsealing",
    revealed: [],
    cascading: false,
  };
}

export function finishChest(
  session: RevealSession,
  openingId: string,
): RevealSession {
  return session.id === openingId ? { ...session, phase: "cards" } : session;
}

export function revealDrop(
  session: RevealSession,
  index: number,
  count: number,
): RevealSession {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= count ||
    session.revealed.includes(index)
  )
    return session;
  const revealed = [...session.revealed, index];
  return {
    ...session,
    phase: "cards",
    revealed,
    cascading: session.cascading && revealed.length < count,
  };
}

export function revealEveryDrop(
  session: RevealSession,
  count: number,
): RevealSession {
  return {
    ...session,
    phase: "cards",
    revealed: Array.from({ length: count }, (_, index) => index),
    cascading: false,
  };
}

export function nextHiddenDrop(
  session: RevealSession,
  count: number,
): number | undefined {
  return Array.from({ length: count }, (_, index) => index).find(
    (index) => !session.revealed.includes(index),
  );
}

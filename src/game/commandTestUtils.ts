/** In-memory command adapter for UI tests; it never accesses a player's save. */
import { applyGameCommand } from "./commands";
import type { CommandResponse, GameCommand } from "./commands";
import type { GameState } from "./engine";

export function commandFixture(
  state: GameState,
  result: Record<string, unknown> = {},
): CommandResponse {
  return {
    state,
    revision: 1,
    serverTime: new Date().toISOString(),
    result,
    replayed: false,
  };
}
export function runCommandFixture(
  state: GameState,
  command: GameCommand,
  nowMs = Date.now(),
): CommandResponse {
  const applied = applyGameCommand(state, command, nowMs);
  return commandFixture(applied.state, applied.result);
}

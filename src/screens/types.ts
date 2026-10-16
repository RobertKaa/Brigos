import type { useGame } from "../game/useGame";
import type { AdminCommand } from "../game/engine";
import type { GameState } from "../game/engine";
import type { CommandResponse, GameCommand } from "../game/commands";

export type Game = Omit<
  ReturnType<typeof useGame>,
  | "act"
  | "mode"
  | "now"
  | "serverTime"
  | "refresh"
  | "localAct"
  | "connectionError"
> & {
  act: (
    command: GameCommand,
    message?: string,
  ) => Promise<CommandResponse | null>;
  mode?: "local" | "connected";
  now?: () => number;
  serverTime?: string | null;
  connectionError?: string | null;
  refresh?: () => Promise<void>;
  localAct?: (
    transform: (current: GameState) => GameState,
    message?: string,
    options?: { observeEngagement?: boolean },
  ) => Promise<boolean>;
};
export type AdminAction = (
  command: AdminCommand,
  message: string,
) => Promise<boolean>;

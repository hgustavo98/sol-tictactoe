import { TttLobby } from "../ttt2d/TttLobby";
import type { LobbyView } from "../ttt2d/lobby/lobbyView";
import type { GameModeId } from "../config/gameModes";
import type { GameState, LobbyMatch, MatchmakeStatusPayload, TournamentFinishedPayload, TournamentQueueStatus, TournamentState, PlayerProfile } from "@sol-tictactoe/shared";
import type { Socket } from "socket.io-client";

interface LobbyCenterProps {
  lobbies: LobbyMatch[];
  betSol: number;
  loading: boolean;
  playerId?: string;
  viewerWallet?: string;
  isGuest?: boolean;
  walletConnected?: boolean;
  guestModeActive?: boolean;
  guestStarting?: boolean;
  onPlayAsGuest?: () => void;
  lobbyView: LobbyView;
  activeMatchId?: string | null;
  waitingBet?: number;
  waitingGameMode?: GameModeId;
  waitingOnChain?: string;
  gameState?: GameState | null;
  socket?: Socket | null;
  myProfile?: PlayerProfile | null;
  opponentProfile?: PlayerProfile | null;
  matchmakeQueued?: boolean;
  matchmakeStatus?: MatchmakeStatusPayload | null;
  tournamentQueue?: TournamentQueueStatus | null;
  allTournamentQueues?: TournamentQueueStatus[];
  tournamentRegistered?: boolean;
  onSelectBet: (bet: number) => void;
  onModeChange: (mode: GameModeId) => void;
  onPlay: (mode: GameModeId) => void;
  onRankedMatchmake?: () => void;
  onRankedOpenTable?: () => void;
  onRankedCancel?: () => void;
  onTournamentRegister?: () => void;
  onTournamentUnregister?: () => void;
  onExitLobbyView: () => void;
  onCancelWaiting?: () => void;
  onResign?: () => void;
  activeTournament?: TournamentState | null;
  tournamentPostGame?: "won" | "lost" | null;
  tournamentFinished?: TournamentFinishedPayload | null;
  tournamentProfiles?: Record<string, PlayerProfile>;
  onExitTournament?: () => void;
  hostProfiles?: Record<string, PlayerProfile>;
  onJoinLobby?: (lobby: LobbyMatch) => void;
}

export function LobbyCenter(props: LobbyCenterProps) {
  return <TttLobby {...props} />;
}

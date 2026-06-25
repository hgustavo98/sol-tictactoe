import type { ReactNode } from "react";
import type { LobbyView } from "../../ttt2d/lobby/lobbyView";

interface MainLayoutProps {
  children: ReactNode;
  lobbyView?: LobbyView;
}

/** Viewport único — menu e jogo em tela cheia (sem colunas de perfil/mesas). */
export function MainLayout({
  children,
  lobbyView: _lobbyView = "browse",
}: MainLayoutProps) {
  return <div className="app-game-viewport">{children}</div>;
}

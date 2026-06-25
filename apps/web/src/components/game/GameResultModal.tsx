import * as Dialog from "@radix-ui/react-dialog";
import {
  Minus,
  Skull,
  Trophy,
  ExternalLink,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  formatEloDelta,
  type GameOverResult,
} from "@sol-tictactoe/shared";
import { Button } from "@/components/ui/button";
import { SolAmount } from "@/components/icons/SolanaIcon";
import { cn } from "@/lib/utils";
import { formatSolAmount } from "../../config/bets";
import { EXPLORER_TX } from "../../config/tokens";
import {
  gameResultEconomics,
  gameResultReasonKey,
  resolveGameOutcome,
  type GameOutcome,
} from "../../utils/gameResult";

const GAME_RESULT_MODAL_Z = 40_000_000;

interface GameResultModalProps {
  open: boolean;
  result: GameOverResult;
  playerId: string;
  isTournamentMatch: boolean;
  onContinue: () => void;
}

function outcomeMeta(outcome: GameOutcome, isTournament: boolean) {
  if (isTournament && outcome === "win") {
    return {
      icon: Trophy,
      titleKey: "gameResult.tournamentWinTitle",
      tone: "win" as const,
    };
  }
  if (isTournament && outcome === "loss") {
    return {
      icon: Skull,
      titleKey: "gameResult.tournamentLossTitle",
      tone: "loss" as const,
    };
  }
  if (outcome === "win") {
    return { icon: Trophy, titleKey: "gameResult.victoryTitle", tone: "win" as const };
  }
  if (outcome === "loss") {
    return { icon: Skull, titleKey: "gameResult.defeatTitle", tone: "loss" as const };
  }
  return { icon: Minus, titleKey: "gameResult.drawTitle", tone: "draw" as const };
}

export function GameResultModal({
  open,
  result,
  playerId,
  isTournamentMatch,
  onContinue,
}: GameResultModalProps) {
  const { t } = useTranslation();

  if (typeof document === "undefined" || !open) return null;

  const outcome = resolveGameOutcome(playerId, result);
  const meta = outcomeMeta(outcome, isTournamentMatch);
  const Icon = meta.icon;
  const economics = gameResultEconomics(result);
  const myRating = result.ratingChanges?.find((c) => c.wallet === playerId);
  const reasonKey = gameResultReasonKey(
    result.reason ?? result.state.endReason,
    outcome,
  );

  const continueLabel =
    isTournamentMatch && outcome === "win"
      ? t("gameResult.waitNextRound")
      : t("gameResult.continue");

  return (
    <Dialog.Root open={open} onOpenChange={() => {}}>
      {createPortal(
        <>
          <Dialog.Overlay
            className={cn(
              "game-result-overlay fixed inset-0 bg-black/75 backdrop-blur-[6px]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            )}
            style={{ zIndex: GAME_RESULT_MODAL_Z }}
          />
          <Dialog.Content
            className={cn(
              "game-result-modal fixed left-1/2 top-1/2 w-full max-w-[min(420px,calc(100vw-32px))]",
              "-translate-x-1/2 -translate-y-1/2 rounded-2xl border p-5 text-white outline-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              meta.tone === "win" && "game-result-modal-win",
              meta.tone === "loss" && "game-result-modal-loss",
              meta.tone === "draw" && "game-result-modal-draw",
            )}
            style={{ zIndex: GAME_RESULT_MODAL_Z + 1 }}
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className={cn("game-result-icon", `game-result-icon-${meta.tone}`)}>
                <Icon className="size-7" aria-hidden />
              </div>

              <div className="space-y-1.5">
                <Dialog.Title className="game-result-title">
                  {t(meta.titleKey)}
                </Dialog.Title>
                <Dialog.Description className="game-result-reason">
                  {t(reasonKey)}
                </Dialog.Description>
              </div>

              {isTournamentMatch && outcome === "win" && (
                <p className="game-result-note game-result-note-tournament">
                  {t("gameResult.tournamentAdvance")}
                </p>
              )}

              {isTournamentMatch && outcome === "loss" && (
                <p className="game-result-note game-result-note-tournament">
                  {t("gameResult.tournamentEliminated")}
                </p>
              )}

              {isTournamentMatch && outcome !== "draw" && (
                <p className="game-result-note game-result-note-muted">
                  {t("gameResult.tournamentNoSolYet")}
                </p>
              )}

              {isTournamentMatch && myRating && (
                <div className="game-result-elo-block">
                  <span className="game-result-elo-label">
                    {t("gameResult.eloThisMatch")}
                  </span>
                  <span
                    className={cn(
                      "game-result-elo-delta font-mono font-bold",
                      myRating.delta >= 0
                        ? "game-result-rating-up"
                        : "game-result-rating-down",
                    )}
                  >
                    {formatEloDelta(myRating.delta)} → {myRating.ratingAfter}
                  </span>
                  <p className="game-result-elo-note">
                    {t("gameResult.tournamentEloExplain")}
                  </p>
                </div>
              )}

              {!isTournamentMatch && economics.isFree && outcome === "win" && (
                <p className="game-result-note">{t("gameResult.freeCongrats")}</p>
              )}

              {!isTournamentMatch && economics.isFree && outcome === "loss" && (
                <p className="game-result-note">{t("gameResult.freeLoss")}</p>
              )}

              {!isTournamentMatch && !economics.isFree && outcome === "win" && (
                <div className="game-result-amount game-result-amount-win">
                  <span className="game-result-amount-label">
                    {t("gameResult.youWonLabel")}
                  </span>
                  <SolAmount
                    amount={formatSolAmount(economics.prizeSol)}
                    suffix
                    iconClassName="size-4"
                    className="game-result-amount-value"
                  />
                </div>
              )}

              {!isTournamentMatch && !economics.isFree && outcome === "loss" && (
                <div className="game-result-amount game-result-amount-loss">
                  <span className="game-result-amount-label">
                    {t("gameResult.youLostLabel")}
                  </span>
                  <SolAmount
                    amount={formatSolAmount(economics.entrySol)}
                    suffix
                    iconClassName="size-4"
                    className="game-result-amount-value"
                  />
                </div>
              )}

              {!isTournamentMatch && !economics.isFree && outcome === "draw" && (
                <div className="game-result-amount game-result-amount-draw">
                  <span className="game-result-amount-label">
                    {t("gameResult.refundLabel")}
                  </span>
                  <SolAmount
                    amount={formatSolAmount(economics.refundSol)}
                    suffix
                    iconClassName="size-4"
                    className="game-result-amount-value"
                  />
                </div>
              )}

              {!isTournamentMatch && myRating && (
                <div className="game-result-elo-block">
                  <span className="game-result-elo-label">
                    {t("gameResult.eloThisMatch")}
                  </span>
                  <span
                    className={cn(
                      "game-result-elo-delta font-mono font-bold",
                      myRating.delta >= 0
                        ? "game-result-rating-up"
                        : "game-result-rating-down",
                    )}
                  >
                    {formatEloDelta(myRating.delta)} → {myRating.ratingAfter}
                  </span>
                  <p className="game-result-elo-note">{t("elo.notSymmetric")}</p>
                </div>
              )}

              {result.settleSignature && (
                <a
                  href={EXPLORER_TX(result.settleSignature)}
                  target="_blank"
                  rel="noreferrer"
                  className="game-result-tx-link"
                >
                  <ExternalLink className="size-3.5" />
                  {t("gameResult.viewTx")}
                </a>
              )}

              <div className="game-result-actions">
                <Button
                  type="button"
                  variant={meta.tone === "loss" ? "destructive" : "default"}
                  className="game-result-btn-primary"
                  onClick={onContinue}
                >
                  {continueLabel}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </>,
        document.body,
      )}
    </Dialog.Root>
  );
}

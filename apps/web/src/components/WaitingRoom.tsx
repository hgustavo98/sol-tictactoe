import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, Loader2, Users } from "lucide-react";
import {
  computeBetBreakdown,
  LOBBY_CANCEL_REFUND_WAIT_MS,
  LOBBY_CANCEL_REFUND_WAIT_SECS,
  type LobbyMatch,
} from "@sol-tictactoe/shared";
import { formatDurationSeconds } from "@/lib/graceTime";
import { fadeUp } from "@/components/motion/ViewTransition";
import { SolAmount } from "@/components/icons/SolanaIcon";
import { BrandLogo } from "@/components/icons/BrandLogo";
import { AudioMuteToggle } from "@/damas3d/components/AudioMuteToggle";
import {
  waitingBackBtn,
  waitingCancelBtn,
  waitingCancelBtnForfeit,
  waitingCancelPolicyOk,
  waitingCard,
  waitingCardHeader,
  waitingCardLabel,
  waitingCardRow,
  waitingCardValue,
  waitingCopyBtn,
  waitingHint,
  waitingModeBadge,
  waitingPotValue,
  waitingRefundCountdown,
  waitingRefundCountdownValue,
  waitingRoomIcon,
  waitingRoomOverlay,
  waitingRoomShell,
  waitingRoomSubtitle,
  waitingRoomTitle,
  waitingRoomTopBar,
  waitingStepDot,
  waitingStepDotActive,
  waitingStepDotDone,
  waitingStepDotPending,
  waitingStepItem,
  waitingStepLabel,
  waitingStepLabelActive,
  waitingSteps,
} from "@/damas3d/lobby/lobbyClasses";
import { EXPLORER_ADDRESS, isOnChainAddress } from "../config/tokens";
import { CancelTableConfirmDialog } from "./CancelTableConfirmDialog";
import { rakeBpsForMode, type GameModeId } from "../config/gameModes";

interface WaitingRoomProps {
  matchId: string;
  lobby?: LobbyMatch | null;
  gameMode?: GameModeId;
  onChainAddress?: string;
  betLamports?: number;
  playerId?: string;
  role?: "creator" | "joiner";
  onCancel?: () => void;
  onStart?: () => void;
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

type StepState = "done" | "active" | "pending";

function stepClass(state: StepState) {
  if (state === "done") return waitingStepDotDone;
  if (state === "active") return waitingStepDotActive;
  return waitingStepDotPending;
}

export function WaitingRoom({
  matchId,
  lobby,
  gameMode: gameModeProp,
  onChainAddress,
  betLamports = 0,
  playerId,
  role: roleProp,
  onCancel,
  onStart,
}: WaitingRoomProps) {
  const { t } = useTranslation();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [copied, setCopied] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const createdAt = useMemo(
    () => lobby?.createdAt ?? Date.now(),
    [matchId, lobby?.createdAt],
  );
  const hasOpponent = Boolean(lobby?.player2);
  const entryLamports = lobby?.betLamports ?? betLamports;
  const isFree = entryLamports === 0;
  const awaitingFunds =
    !isFree && hasOpponent && lobby?.status === "joined";
  const role =
    roleProp ??
    (playerId && lobby?.player2 === playerId ? "joiner" : "creator");
  const gameMode =
    gameModeProp ??
    lobby?.gameMode ??
    (lobby?.ranked ? "ranked1v1" : betLamports > 0 ? "custom1v1" : "casual1v1");
  const modeName = t(`modes.${gameMode}.name`, { defaultValue: gameMode });
  const escrowAddress = onChainAddress || lobby?.onChainAddress;
  const showEscrow = Boolean(escrowAddress && isOnChainAddress(escrowAddress));

  const potSol = useMemo(() => {
    if (betLamports <= 0) return null;
    const rakeBps =
      lobby?.rakeBps ?? rakeBpsForMode(gameMode as GameModeId);
    const breakdown = computeBetBreakdown(betLamports, rakeBps);
    return (breakdown.maxPayoutLamports / 1_000_000_000).toFixed(4);
  }, [betLamports, gameMode, lobby?.rakeBps]);

  useEffect(() => {
    const tick = () => setElapsedMs(Date.now() - createdAt);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [createdAt]);

  const copyMatchId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(matchId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [matchId]);

  const refundEligible =
    !isFree &&
    !hasOpponent &&
    role === "creator" &&
    elapsedMs >= LOBBY_CANCEL_REFUND_WAIT_MS;
  const refundWaitSec = Math.max(
    0,
    Math.ceil((LOBBY_CANCEL_REFUND_WAIT_MS - elapsedMs) / 1000),
  );
  const refundWaitLabel = formatDurationSeconds(refundWaitSec);
  const refundThresholdLabel = formatDurationSeconds(
    LOBBY_CANCEL_REFUND_WAIT_SECS,
  );

  const handleCancelClick = useCallback(() => {
    if (!onCancel) return;
    if (isFree || hasOpponent || refundEligible) {
      onCancel();
      return;
    }
    setCancelConfirmOpen(true);
  }, [onCancel, isFree, hasOpponent, refundEligible]);

  const subtitle =
    role === "joiner"
      ? awaitingFunds
        ? t("waiting.fundPrompt")
        : t("waiting.joiner")
      : hasOpponent
        ? awaitingFunds
          ? t("waiting.fundPrompt")
          : t("waiting.opponentJoined")
        : isFree
          ? t("waiting.creatorFree")
          : t("waiting.creatorPaid");

  const stepStates: StepState[] = awaitingFunds
    ? ["done", "done", "done", "active"]
    : hasOpponent
      ? ["done", "done", "done", "active"]
      : ["done", "active", "pending", "pending"];

  const stepKeys = [
    "waiting.stepCreated",
    "waiting.stepWaiting",
    "waiting.stepJoined",
    "waiting.stepStarting",
  ] as const;

  return (
    <div className={waitingRoomOverlay}>
      <div className={waitingRoomTopBar}>
        <AudioMuteToggle />
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className={waitingRoomShell}
      >
        <motion.div
          animate={
            hasOpponent
              ? { scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }
              : { scale: [1, 1.05, 1], opacity: [0.75, 1, 0.75] }
          }
          transition={{
            duration: hasOpponent ? 0.8 : 2.4,
            repeat: hasOpponent ? 0 : Infinity,
            ease: "easeInOut",
          }}
          className={waitingRoomIcon}
          aria-hidden
        >
          {hasOpponent ? (
            <BrandLogo size={52} />
          ) : (
            <span aria-hidden>♟</span>
          )}
        </motion.div>

        <div className="text-center">
          <h2 className={waitingRoomTitle}>{t("waiting.title")}</h2>
          <p className={waitingRoomSubtitle}>{subtitle}</p>
        </div>

        <div
          className={`${waitingSteps} grid grid-cols-4 gap-1`}
          role="list"
          aria-label={t("waiting.progress")}
        >
          {stepKeys.map((key, i) => {
            const state = stepStates[i];
            return (
              <div key={key} className={waitingStepItem} role="listitem">
                <div className={`${waitingStepDot} ${stepClass(state)}`}>
                  {state === "done" ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : state === "active" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`${waitingStepLabel} ${state === "active" ? waitingStepLabelActive : ""}`}
                >
                  {t(key)}
                </span>
              </div>
            );
          })}
        </div>

        <div className={waitingCard}>
          <div className={waitingCardHeader}>
            <span className={waitingModeBadge}>{modeName}</span>
            {!hasOpponent && role === "creator" && (
              <span className="inline-flex items-center gap-1 font-game text-[0.62rem] font-bold text-cyan-300/80">
                <Users className="size-3" />
                {t("waiting.listed")}
              </span>
            )}
          </div>

          <div className={waitingCardRow}>
            <span className={waitingCardLabel}>{t("waiting.matchLabel")}</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className={waitingCardValue} title={matchId}>
                {shortId(matchId)}
              </span>
              <button
                type="button"
                className={waitingCopyBtn}
                onClick={() => void copyMatchId()}
              >
                {copied ? (
                  <>
                    <Check className="mr-0.5 inline size-3" />
                    {t("waiting.copied")}
                  </>
                ) : (
                  <>
                    <Copy className="mr-0.5 inline size-3" />
                    {t("waiting.copyId")}
                  </>
                )}
              </button>
            </div>
          </div>

          {isFree ? (
            <div className={waitingCardRow}>
              <span className={waitingCardLabel}>{t("waiting.stakeLabel")}</span>
              <span className="font-game text-[0.78rem] font-bold text-emerald-300/90">
                {t("waiting.freeMatch")}
              </span>
            </div>
          ) : (
            <>
              <div className={waitingCardRow}>
                <span className={waitingCardLabel}>{t("waiting.stakeLabel")}</span>
                <SolAmount
                  amount={(betLamports / 1_000_000_000).toFixed(4)}
                  className="font-display text-[0.85rem] font-bold text-cyan-200"
                />
              </div>
              {potSol && (
                <div className={waitingCardRow}>
                  <span className={waitingCardLabel}>{t("waiting.potLabel")}</span>
                  <span className={waitingPotValue}>
                    <SolAmount amount={potSol} />
                  </span>
                </div>
              )}
            </>
          )}

          {(hasOpponent || role === "joiner") && (() => {
            const opponentWallet =
              role === "joiner" ? lobby?.player1 : lobby?.player2;
            if (!opponentWallet) return null;
            return (
              <div className={waitingCardRow}>
                <span className={waitingCardLabel}>
                  {role === "joiner"
                    ? t("waiting.hostLabel")
                    : t("waiting.opponentLabel")}
                </span>
                <span className={waitingCardValue}>
                  {`${opponentWallet.slice(0, 4)}…${opponentWallet.slice(-4)}`}
                </span>
              </div>
            );
          })()}

          {showEscrow && (
            <a
              href={EXPLORER_ADDRESS(escrowAddress!)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center justify-center gap-1 font-game text-[0.68rem] font-semibold text-cyan-400/90 hover:text-cyan-300 hover:underline"
            >
              {t("waiting.viewEscrow")}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        {!hasOpponent && role === "creator" && !isFree && !refundEligible && (
          <div className={waitingRefundCountdown} aria-live="polite">
            <div className={waitingRefundCountdownValue}>{refundWaitLabel}</div>
          </div>
        )}

        {!hasOpponent && role === "creator" && !isFree && refundEligible && (
          <div className={waitingCancelPolicyOk}>
            {t("waiting.cancelPolicyRefundReady", {
              waitTime: refundThresholdLabel,
            })}
          </div>
        )}

        {!hasOpponent && role === "creator" && (
          <p className={waitingHint}>{t("waiting.visibleInList")}</p>
        )}

        {!hasOpponent && role === "creator" && !isFree && (
          <p className={waitingHint}>{t("waiting.disconnectPolicy")}</p>
        )}

        {onStart && (
          <button type="button" className={waitingCancelBtn} onClick={onStart}>
            {t("waiting.goToBoard")}
          </button>
        )}

        {onCancel && role === "creator" && !hasOpponent && (
          <button
            type="button"
            className={
              isFree
                ? waitingCancelBtn
                : refundEligible
                  ? waitingCancelBtn
                  : waitingCancelBtnForfeit
            }
            onClick={handleCancelClick}
          >
            {isFree
              ? t("waiting.cancelTable")
              : refundEligible
                ? t("waiting.cancelTableRefund")
                : t("waiting.cancelTableForfeit")}
          </button>
        )}

        {onCancel && (hasOpponent || role === "joiner") && (
          <button type="button" className={waitingBackBtn} onClick={onCancel}>
            {t("waiting.backToLobby")}
          </button>
        )}
      </motion.div>

      <CancelTableConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        onConfirm={() => onCancel?.()}
        refundWaitLabel={refundWaitLabel}
        refundThresholdLabel={refundThresholdLabel}
      />
    </div>
  );
}

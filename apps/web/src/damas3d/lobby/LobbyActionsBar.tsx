import type { ReactNode } from "react";
import { Coins, Gamepad2, Loader2, Swords, Trophy, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { MatchmakeStatusPayload } from "@sol-tictactoe/shared";
import type { GameModeId } from "../../config/gameModes";
import {
  actionBtnEntrySlot,
  actionBtnTitleSlot,
  actionHint,
  actionsBar,
  actionsPanel,
  openTablesBtn,
  openTablesBtnCount,
  openTablesBtnTitle,
  playBtn,
  playEntry,
  playLoading,
  playTitle,
  playTitleIconSlot,
  playTitleWithIcon,
  rankedPrimaryBtn,
  customPrimaryBtn,
  rankedCancel,
  rankedQueued,
  rankedSub,
} from "./lobbyClasses";
import { tournamentPrimaryBtnClass } from "./tournamentStyles";

interface LobbyActionsBarProps {
  playLabel: string;
  entryLabel: ReactNode;
  tournamentLabel: string;
  playHint: string;
  rankedHint: string;
  tournamentHint: string;
  playDisabled: boolean;
  rankedDisabled: boolean;
  tournamentDisabled: boolean;
  loading: boolean;
  matchmakeQueued: boolean;
  matchmakeStatus: MatchmakeStatusPayload | null;
  onPlay: () => void;
  onRankedMatchmake: () => void;
  onRankedOpenTable: () => void;
  onRankedCancel: () => void;
  isRankedMode?: boolean;
  isRankedStakeMode?: boolean;
  isCustomMode?: boolean;
  isFreeCasualMode?: boolean;
  isTournamentMode?: boolean;
  activeMode?: GameModeId;
  tournamentRegistered?: boolean;
  tournamentWaitingLabel?: string;
  onTournamentRegister?: () => void;
  onTournamentUnregister?: () => void;
  openTablesCount?: number;
  openTablesActive?: boolean;
  onOpenTables?: () => void;
}

interface ActionPrimaryButtonProps {
  className: string;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  entry: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
  loadingText: string;
}

function ActionPrimaryButton({
  className,
  disabled,
  onClick,
  title,
  entry,
  icon,
  loading,
  loadingText,
}: ActionPrimaryButtonProps) {
  return (
    <button
      type="button"
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <span className={playLoading}>
          <Loader2 className="size-4 animate-spin" />
          {loadingText}
        </span>
      ) : (
        <>
          <span className={actionBtnTitleSlot}>
            <span className={playTitleWithIcon}>
              <span className={playTitleIconSlot}>
                {icon ?? <span className="size-4" aria-hidden />}
              </span>
              <span className={playTitle}>{title}</span>
            </span>
          </span>
          <span className={cn(actionBtnEntrySlot, playEntry)}>{entry}</span>
        </>
      )}
    </button>
  );
}

function QueuedState({ message }: { message: string }) {
  return (
    <div className={rankedQueued}>
      <span className={actionBtnTitleSlot}>
        <span className={playTitleWithIcon}>
          <Loader2 className="size-4 shrink-0 animate-spin" />
          <span className={playTitle}>{message}</span>
        </span>
      </span>
      <span className={cn(actionBtnEntrySlot, playEntry, "invisible")}>
        —
      </span>
    </div>
  );
}

/** Painel Play/Ranked/Torneio fixo na base do lobby (DOM — não corta texto). */
export function LobbyActionsBar({
  playLabel,
  entryLabel,
  tournamentLabel,
  playHint,
  rankedHint,
  tournamentHint,
  playDisabled,
  rankedDisabled,
  tournamentDisabled,
  loading,
  matchmakeQueued,
  matchmakeStatus,
  onPlay,
  onRankedMatchmake,
  onRankedOpenTable,
  onRankedCancel,
  isRankedMode = false,
  isRankedStakeMode = false,
  isCustomMode = false,
  isFreeCasualMode = false,
  isTournamentMode = false,
  activeMode = "casual1v1",
  tournamentRegistered = false,
  tournamentWaitingLabel,
  onTournamentRegister,
  onTournamentUnregister,
  openTablesCount = 0,
  openTablesActive = false,
  onOpenTables,
}: LobbyActionsBarProps) {
  const { t } = useTranslation();

  const hint = isTournamentMode
    ? tournamentHint
    : isRankedMode
      ? rankedHint
      : playHint;

  const showMatchmakeQueued =
    matchmakeQueued && isRankedMode && !isRankedStakeMode;
  const showTournamentQueued = isTournamentMode && tournamentRegistered;
  const showQueued = showMatchmakeQueued || showTournamentQueued;

  const queuedMessage =
    showTournamentQueued
      ? (tournamentWaitingLabel ??
        t("tournament.waiting", { current: 0, total: 0 }))
      : t("ranked.searching");

  const queuedSub =
    matchmakeQueued && matchmakeStatus?.searchRadius != null
      ? t("ranked.matching", { radius: matchmakeStatus.searchRadius })
      : null;

  const onCancelQueued = showTournamentQueued
    ? onTournamentUnregister
    : onRankedCancel;

  const cancelLabel = showTournamentQueued
    ? t("tournament.cancel")
    : t("ranked.cancel");

  return (
    <div className={actionsBar}>
      <div className={actionsPanel}>
        {onOpenTables && (
          <button
            type="button"
            className={cn(openTablesBtn, openTablesActive && "open-tables-btn-active")}
            onClick={onOpenTables}
            aria-expanded={openTablesActive}
          >
            <span className={actionBtnTitleSlot}>
              <span className={playTitleWithIcon}>
                <span className={playTitleIconSlot}>
                  <Users className="size-3.5 shrink-0" aria-hidden />
                </span>
                <span className={openTablesBtnTitle}>
                  {t("openTables.browse")}
                  {openTablesCount > 0 && (
                    <span className={openTablesBtnCount}>{openTablesCount}</span>
                  )}
                </span>
              </span>
            </span>
          </button>
        )}
        {showQueued ? (
          <QueuedState message={queuedMessage} />
        ) : isTournamentMode ? (
          <ActionPrimaryButton
            className={tournamentPrimaryBtnClass(activeMode)}
            disabled={tournamentDisabled}
            loading={loading}
            loadingText={t("play.starting")}
            title={tournamentLabel}
            entry={entryLabel}
            icon={<Trophy className="size-4 shrink-0" />}
            onClick={onTournamentRegister ?? (() => {})}
          />
        ) : isRankedMode && isRankedStakeMode ? (
          <ActionPrimaryButton
            className={rankedPrimaryBtn}
            disabled={rankedDisabled}
            loading={loading}
            loadingText={t("play.starting")}
            title={t("ranked.openTable")}
            entry={entryLabel}
            icon={<Swords className="size-4 shrink-0" />}
            onClick={onRankedOpenTable}
          />
        ) : isRankedMode && !isRankedStakeMode ? (
          <ActionPrimaryButton
            className={rankedPrimaryBtn}
            disabled={rankedDisabled}
            loading={loading}
            loadingText={t("play.starting")}
            title={t("ranked.openTable")}
            entry={entryLabel}
            icon={<Swords className="size-4 shrink-0" />}
            onClick={onRankedOpenTable ?? onRankedMatchmake}
          />
        ) : isCustomMode ? (
          <ActionPrimaryButton
            className={customPrimaryBtn}
            disabled={playDisabled}
            loading={loading}
            loadingText={t("play.starting")}
            title={t("play.openTable")}
            entry={entryLabel}
            icon={<Coins className="size-4 shrink-0" />}
            onClick={onPlay}
          />
        ) : isFreeCasualMode ? (
          <ActionPrimaryButton
            className={playBtn}
            disabled={playDisabled}
            loading={loading}
            loadingText={t("play.starting")}
            title={t("play.openTable")}
            entry={entryLabel}
            icon={<Gamepad2 className="size-4 shrink-0" />}
            onClick={onPlay}
          />
        ) : (
          <ActionPrimaryButton
            className={playBtn}
            disabled={playDisabled}
            loading={loading}
            loadingText={t("play.starting")}
            title={playLabel}
            entry={entryLabel}
            icon={<Gamepad2 className="size-4 shrink-0" />}
            onClick={onPlay}
          />
        )}
        <p className={actionHint}>
          {showQueued ? (
            <>
              {queuedSub && <span className={rankedSub}>{queuedSub}</span>}
              {queuedSub && " · "}
              <button
                type="button"
                className={cn(rankedCancel, "inline align-baseline")}
                onClick={onCancelQueued}
              >
                {cancelLabel}
              </button>
            </>
          ) : isRankedMode ? (
            rankedHint
          ) : (
            hint
          )}
        </p>
      </div>
    </div>
  );
}

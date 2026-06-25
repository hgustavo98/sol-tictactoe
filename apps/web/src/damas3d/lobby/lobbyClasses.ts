import { cn } from "@/lib/utils";
import type { LobbyViewportTier } from "./lobbyCarouselLayout";

export const lobbyRoot =
  "lobby-root absolute inset-0 flex min-h-0 flex-col overflow-hidden";

export const lobbyPanel = cn(
  "relative flex min-h-0 flex-1 flex-col justify-start gap-0 overflow-hidden",
  "w-full h-full",
);

export const lobbySceneRoot =
  "lobby-scene-root absolute inset-0 z-0 overflow-hidden";

export const lobbyCanvas =
  "lobby-canvas absolute inset-0 block h-full w-full touch-none";

export function bannerWidth(
  isCenter: boolean,
  isNear: boolean,
  tier: LobbyViewportTier = "desktop",
) {
  if (tier === "mobile") {
    return "arena-banner arena-banner--mobile-slot w-[min(76vw,14rem)] max-w-[88%]";
  }
  if (isCenter) {
    return "arena-banner arena-banner--center w-[clamp(12rem,min(92vw,34vw),24rem)] max-w-[96%]";
  }
  if (isNear) {
    return "arena-banner arena-banner--near w-[clamp(8.5rem,min(68vw,28vw),17rem)] max-w-[90%]";
  }
  return "arena-banner arena-banner--far w-[clamp(6.5rem,min(52vw,22vw),14rem)] max-w-[84%]";
}

export function bannerHeight(
  isCenter: boolean,
  isNear: boolean,
  tier: LobbyViewportTier = "desktop",
) {
  if (tier === "mobile") {
    return "arena-banner-body arena-banner-body--mobile-slot h-auto min-h-0 max-h-[var(--lobby-banner-max-height,14rem)] overflow-visible";
  }
  if (isCenter) {
    return "arena-banner-body arena-banner-body--center min-h-[clamp(11.5rem,min(44vh,48dvh),23rem)]";
  }
  if (isNear) {
    return "arena-banner-body arena-banner-body--near min-h-[clamp(10rem,min(40vh,42dvh),20rem)]";
  }
  return "arena-banner-body arena-banner-body--far min-h-[clamp(8.5rem,min(36vh,38dvh),16rem)]";
}

export const bannerBase = cn(
  "relative box-border overflow-hidden font-game text-white",
  "pointer-events-none select-none",
);

export const bannerInteractive = cn(
  "pointer-events-auto cursor-pointer",
  "transition-[filter,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
  "hover:brightness-110 hover:scale-[1.03]",
);

export const bannerCenter = cn(
  "pointer-events-auto",
  "animate-banner-enter",
  "transition-[transform,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
);

export const cyberStripe = cn(
  "absolute top-0 bottom-0 left-0 z-2 flex w-[clamp(1.5rem,4.5vw,2.35rem)] items-center justify-center",
  "[clip-path:polygon(0_0,100%_8%,100%_92%,0_100%)]",
  "[background:linear-gradient(180deg,color-mix(in_srgb,var(--card-accent,#ff8c42)_95%,#000)_0%,color-mix(in_srgb,var(--card-accent,#ff8c42)_60%,#1a0808)_100%)]",
  "[border-right:1.5px_solid_color-mix(in_srgb,var(--card-accent,#ff8c42)_85%,#3d1515)]",
  "animate-stripe-glow",
);

export const cyberStripeText = cn(
  "max-h-[90%] overflow-hidden text-ellipsis font-display text-[0.9rem] font-black",
  "tracking-[0.22em] text-white uppercase [writing-mode:vertical-rl]",
  "rotate-180 whitespace-nowrap",
  "[text-shadow:0_0_12px_var(--card-accent,#ff8c42),0_0_24px_color-mix(in_srgb,var(--card-accent,#ff8c42)_50%,transparent)]",
);

export const cyberBody = cn(
  "relative flex flex-col items-center justify-center gap-[clamp(0.5rem,2vw,0.75rem)] text-center",
  "ml-[clamp(1.5rem,4.5vw,2.35rem)] px-[clamp(0.55rem,2.2vw,0.9rem)] pt-[clamp(0.65rem,2.2vw,1.15rem)] pb-[clamp(0.65rem,2.2vw,1.15rem)]",
  "bg-[#06101e]",
  "[border:1.5px_solid_color-mix(in_srgb,var(--card-accent,#ff6b35)_78%,#3d1515)]",
  "[clip-path:polygon(0_10px,10px_0,calc(100%-10px)_0,100%_10px,100%_calc(100%-10px),calc(100%-10px)_100%,10px_100%,0_calc(100%-10px))]",
  "shadow-[0_0_32px_color-mix(in_srgb,var(--card-accent,#ff6b35)_42%,transparent),inset_0_0_28px_color-mix(in_srgb,var(--card-accent,#ff8c42)_10%,transparent)]",
  "animate-cyber-pulse",
);

export const cyberBodySide = "ml-0";

export const cyberCorner =
  "absolute size-2.5 border-solid border-[var(--card-accent,#ff8c42)] opacity-100";

export const cardBadge = cn(
  "inline-block rounded-sm px-3 py-1 font-display text-[0.88rem] font-black",
  "tracking-[0.18em] text-white uppercase",
  "bg-[color-mix(in_srgb,var(--card-accent,#ff8c42)_50%,#1a0808)]",
  "border border-[var(--card-accent,#ff8c42)]",
  "[text-shadow:0_0_10px_var(--card-accent,#ff8c42)]",
  "shadow-[0_0_14px_color-mix(in_srgb,var(--card-accent,#ff8c42)_45%,transparent)]",
);

export const cardTitle = cn(
  "arena-card-title m-0 font-display text-[clamp(1.4rem,5.8vw,2rem)] leading-tight font-black tracking-wide uppercase",
  "text-white [-webkit-text-stroke:0.4px_rgba(0,0,0,0.5)]",
  "[text-shadow:0_0_14px_var(--card-accent,#ff6b35),0_2px_0_rgba(0,0,0,0.8),0_0_2px_#000]",
);

export const cardTitleNear = "text-[clamp(1.15rem,4.4vw,1.55rem)]";

export const cardTitleFeatured = cn(
  "text-[clamp(1.5rem,6.2vw,2.25rem)]",
  "text-[#ffe066]",
  "[text-shadow:0_0_18px_rgba(244,208,63,0.85),0_0_36px_rgba(255,180,0,0.35),0_2px_0_rgba(0,0,0,0.8)]",
);

export const cardSub =
  "m-0 text-[clamp(0.95rem,3.8vw,1.15rem)] leading-snug font-bold text-[rgba(200,230,255,0.9)] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]";

export const prizeBlock = cn(
  "arena-prize-block flex w-full flex-col items-center gap-1.5 rounded-sm px-3.5 py-2.5",
  "bg-[#1a0808]",
  "[border:1px_solid_color-mix(in_srgb,var(--card-accent,#ff6b35)_72%,transparent)]",
  "shadow-[inset_0_0_20px_color-mix(in_srgb,var(--card-accent,#ff6b35)_18%,transparent)]",
);

export const prizeBlockCompact = "px-2 py-1";

export const prizeLabel =
  "arena-prize-label font-display text-[0.8rem] font-extrabold tracking-[0.2em] text-[rgba(200,230,255,0.65)] uppercase";

export const prizeValue = cn(
  "arena-prize-value font-display text-[clamp(1.5rem,6.2vw,2.2rem)] font-black text-[#ff6b35]",
  "[text-shadow:0_0_16px_rgba(46,204,113,0.75),0_2px_0_rgba(0,0,0,0.6)]",
);

export const prizeValueCompact = "text-[1.5rem]";

export const cardStats =
  "flex w-full flex-col items-center gap-1.5 text-[1rem] font-bold text-[rgba(220,235,255,0.92)]";

export const statWaiting = cn(
  "rounded-sm px-3 py-1 font-display text-[0.88rem] tracking-wide",
  "border border-[rgba(230,57,70,0.6)] bg-[rgba(194,69,26,0.32)]",
);

export const statRanked = cn(
  "rounded-sm px-3 py-1 font-display text-[0.88rem] tracking-wide",
  "border border-[rgba(231,76,60,0.65)] bg-[rgba(231,76,60,0.22)]",
  "text-[#ff6b6b] [text-shadow:0_0_10px_rgba(231,76,60,0.45)]",
);

export const statCustom = cn(
  "rounded-sm px-3 py-1 font-display text-[0.88rem] tracking-wide",
  "border border-[rgba(255,140,66,0.65)] bg-[rgba(255,140,66,0.2)]",
  "text-[#ffb347] [text-shadow:0_0_10px_rgba(255,140,66,0.4)]",
);

export const statTournamentBase = cn(
  "rounded-sm px-3 py-1 font-display text-[0.88rem] tracking-wide",
);

export const cardBadgeFeatured = cn(
  cardBadge,
  "relative overflow-visible px-3.5 py-1 text-[0.92rem] tracking-[0.22em]",
  "border-[#f4d03f] bg-[linear-gradient(135deg,#ffe066_0%,#d4ac0d_100%)] text-[#1a1200]",
  "[text-shadow:0_1px_0_rgba(255,255,255,0.35)]",
  "shadow-[0_0_20px_rgba(244,208,63,0.65),0_0_40px_rgba(255,180,0,0.25)]",
  "animate-featured-badge-pulse",
);

export const bannerFeatured = cn(
  "arena-banner--featured",
  "[filter:drop-shadow(0_0_22px_rgba(244,208,63,0.45))]",
);

export const cyberBodyFeatured = cn(
  cyberBody,
  "animate-featured-card-glow",
  "[border-color:rgba(244,208,63,0.85)]",
  "shadow-[0_0_40px_rgba(244,208,63,0.35),0_0_80px_rgba(255,180,0,0.15),inset_0_0_32px_rgba(244,208,63,0.12)]",
);

export const prizeValueFeatured = cn(
  prizeValue,
  "text-[clamp(1.65rem,6.8vw,2.5rem)] text-[#f4d03f]",
  "[text-shadow:0_0_20px_rgba(244,208,63,0.85),0_0_40px_rgba(255,180,0,0.35),0_2px_0_rgba(0,0,0,0.6)]",
);

export const statFeatured = cn(
  statTournamentBase,
  "border-[rgba(244,208,63,0.75)] bg-[rgba(244,208,63,0.18)] text-[#ffe066]",
  "[text-shadow:0_0_12px_rgba(244,208,63,0.65)]",
  "animate-featured-badge-pulse",
);

/** @deprecated use statTournamentBase + inline accent */
export const statTournament = cn(
  statTournamentBase,
  "border border-[rgba(155,89,182,0.65)] bg-[rgba(155,89,182,0.22)]",
  "text-[#c39bd3] [text-shadow:0_0_10px_rgba(155,89,182,0.45)]",
);

export const entryStrong = cn(
  "font-display text-[1.2rem] text-red-400",
  "[text-shadow:0_0_10px_rgba(230,57,70,0.6)]",
);

export const entryCompact = "font-game text-[0.9rem] font-bold text-[rgba(200,230,255,0.85)]";

export const entryCompactStrong = cn(
  "font-display text-[1.15rem] text-red-400",
  "[text-shadow:0_0_8px_rgba(230,57,70,0.55)]",
);

export const customRow = "flex w-full flex-col gap-0.5";

export const customLabel =
  "text-[0.82rem] tracking-wide text-white/55 uppercase";

export const rankedPresetRow =
  "flex w-full flex-wrap items-center justify-center gap-1";

export const rankedPresetChip = cn(
  "rounded-full border px-3 py-0.5 text-[0.88rem] font-semibold tracking-wide",
  "border-[rgba(255,92,92,0.45)] bg-[#1a0808] text-white/85",
  "transition-all duration-150 hover:border-[rgba(255,92,92,0.75)] hover:text-white",
  "hover:shadow-[0_0_10px_rgba(255,92,92,0.25)]",
);

export const rankedPresetChipActive = cn(
  "border-[rgba(255,92,92,0.95)] bg-[linear-gradient(180deg,rgba(255,92,92,0.35)_0%,rgba(40,8,8,0.95)_100%)]",
  "text-white shadow-[0_0_14px_rgba(255,92,92,0.35)]",
);

export const betStepperRoot = cn(
  "flex w-full items-stretch overflow-hidden rounded-full",
  "border border-[rgba(230,57,70,0.45)] bg-[#1a0808]",
  "shadow-[inset_0_0_12px_rgba(230,57,70,0.06),0_0_14px_rgba(230,57,70,0.12)]",
);

export const betStepperRootCustom = cn(
  "flex w-full items-stretch overflow-hidden rounded-full",
  "border border-[rgba(255,140,66,0.5)] bg-[#140a04]",
  "shadow-[inset_0_0_12px_rgba(255,140,66,0.08),0_0_14px_rgba(255,140,66,0.15)]",
);

export const betStepBtn = cn(
  "flex shrink-0 items-center justify-center",
  "size-10 text-red-300 transition-all duration-150",
  "bg-[linear-gradient(180deg,rgba(194,69,26,0.28)_0%,rgba(42,16,16,0.95)_100%)]",
  "hover:bg-[linear-gradient(180deg,rgba(230,57,70,0.35)_0%,rgba(42,16,16,0.98)_100%)]",
  "hover:text-red-100 hover:shadow-[0_0_12px_rgba(230,57,70,0.35)]",
  "active:scale-95",
  "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:shadow-none",
  "first:rounded-l-full last:rounded-r-full",
  "border-x border-[rgba(230,57,70,0.25)] first:border-l-0 last:border-r-0",
);

export const betStepBtnCustom = cn(
  "flex shrink-0 items-center justify-center",
  "size-10 text-[#ffb347] transition-all duration-150",
  "bg-[linear-gradient(180deg,rgba(255,140,66,0.3)_0%,rgba(40,18,8,0.95)_100%)]",
  "hover:bg-[linear-gradient(180deg,rgba(255,179,71,0.4)_0%,rgba(50,22,10,0.98)_100%)]",
  "hover:text-[#ffd9a8] hover:shadow-[0_0_12px_rgba(255,140,66,0.4)]",
  "active:scale-95",
  "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:shadow-none",
  "first:rounded-l-full last:rounded-r-full",
  "border-x border-[rgba(255,140,66,0.28)] first:border-l-0 last:border-r-0",
);

export const betStepField = cn(
  "min-w-0 flex-1 border-0 bg-transparent px-1 py-1.5",
  "text-center font-display text-[1.1rem] font-bold tracking-wide text-red-50",
  "outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  "[text-shadow:0_0_10px_rgba(230,57,70,0.35)]",
);

export const betStepFieldCustom = cn(
  "min-w-0 flex-1 border-0 bg-transparent px-1 py-1.5",
  "text-center font-display text-[1.1rem] font-bold tracking-wide text-[#ffe8cc]",
  "outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  "[text-shadow:0_0_10px_rgba(255,140,66,0.4)]",
);

/** @deprecated use betStepField */
export const customInput =
  "h-[1.65rem] border-white/15 bg-black/45 text-center text-[0.7rem]";

export const customErr = "text-[0.82rem] leading-tight text-[#ff6b6b]";

export const actionsPanel = cn(
  "lobby-actions-panel pointer-events-auto relative mx-auto flex h-auto w-[min(100%,clamp(12rem,72vw,17rem))] max-w-full shrink-0 flex-col items-center gap-1.5",
  "rounded-lg border border-[rgba(230,57,70,0.2)] bg-[rgba(42,16,16,0.92)]",
  "px-[clamp(0.65rem,3vw,1rem)] py-[clamp(0.45rem,2vw,0.625rem)] shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
);

/** Barra de ações na base do lobby — centrada na largura da cena (abaixo dos banners). */
export const actionsBar = cn(
  "lobby-actions-bar pointer-events-none absolute inset-x-0 top-auto z-[30]",
  "mx-auto flex h-auto w-max max-w-[min(100%,calc(100vw-var(--ui-safe-left,1rem)-var(--ui-safe-right,1rem)))] flex-col items-center justify-center",
  "bottom-[var(--ui-safe-bottom,var(--ui-edge-inset,clamp(0.85rem,3.5vw,1.35rem)))]",
);

/** Base compartilhada — todos os botões de ação têm o mesmo tamanho fixo. */
export const actionPrimaryBtnBase = cn(
  "lobby-action-btn flex h-[clamp(2.75rem,9vw,3.5rem)] w-[min(100%,clamp(10.5rem,68vw,15rem))] max-w-full shrink-0 cursor-pointer flex-col items-center justify-center",
  "rounded-full border-2 px-[clamp(0.5rem,2vw,0.75rem)] py-0",
  "transition-all duration-150 hover:-translate-y-px",
  "disabled:cursor-not-allowed disabled:opacity-45",
);

/** Linha do título — altura fixa (2 linhas no máximo). */
export const actionBtnTitleSlot = cn(
  "flex h-[clamp(1.65rem,5vw,2.05rem)] w-full items-center justify-center px-1",
);

/** Linha da entrada SOL — altura fixa. */
export const actionBtnEntrySlot = cn(
  "flex h-[1rem] w-full items-center justify-center",
);

export const openTablesBtn = cn(
  actionPrimaryBtnBase,
  "h-[clamp(2.15rem,6.5vw,2.45rem)] border-red-500/35",
  "bg-[rgba(42,16,16,0.88)] text-white/88",
  "shadow-[0_0_14px_rgba(230,57,70,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]",
  "hover:border-[rgba(230,57,70,0.55)] hover:bg-[rgba(61,21,21,0.95)]",
  "hover:shadow-[0_0_20px_rgba(230,57,70,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]",
);

export const openTablesBtnTitle = cn(
  "font-display text-[clamp(0.5rem,2.5vw,0.58rem)] font-bold leading-none tracking-wide uppercase",
);

export const openTablesBtnCount = cn(
  "ml-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full",
  "bg-primary/20 px-1 py-0.5 font-game text-[0.52rem] font-bold leading-none text-primary",
);

export const playBtn = cn(
  actionPrimaryBtnBase,
  "border-[rgba(46,204,113,0.65)]",
  "bg-linear-to-b from-[#ff6b35] to-[#c4451a] text-[#0a2818]",
  "shadow-[0_0_20px_rgba(46,204,113,0.45),inset_0_1px_0_rgba(255,255,255,0.25)]",
  "hover:shadow-[0_0_28px_rgba(46,204,113,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]",
);

export const playTitle = cn(
  "font-display text-[clamp(0.54rem,2.8vw,0.62rem)] font-black leading-[1.08] tracking-wide uppercase",
  "text-center line-clamp-2",
);

export const playTitleWithIcon = cn(
  "inline-flex w-full max-w-full items-center justify-center gap-1",
);

export const playTitleIconSlot =
  "flex size-4 shrink-0 items-center justify-center";

export const playEntry = "font-game text-[clamp(0.58rem,2.5vw,0.68rem)] font-bold leading-none opacity-85";

export const playLoading = cn(
  "flex h-full w-full items-center justify-center gap-1.5",
  "font-game text-[0.75rem] font-bold",
);

export const actionHint = cn(
  "m-0 flex min-h-[1.85rem] h-auto w-[min(100%,clamp(10.5rem,68vw,15rem))] max-w-full items-start justify-center",
  "text-center font-game text-[clamp(0.52rem,2.4vw,0.58rem)] leading-snug font-semibold",
  "text-white/45 line-clamp-3",
);

export const rankedBtn = cn(
  "inline-flex w-full max-w-[15rem] cursor-pointer items-center justify-center gap-1.5",
  "rounded-sm border border-[rgba(230,57,70,0.55)] bg-[rgba(194,69,26,0.15)]",
  "px-4 py-1.5 font-display text-[0.65rem] font-bold tracking-wide text-[#ff6b35] uppercase",
  "shadow-[0_0_14px_rgba(230,57,70,0.25)] transition-colors duration-150",
  "hover:bg-[rgba(255,107,53,0.22)] disabled:cursor-not-allowed disabled:opacity-40",
);

export const rankedPrimaryBtn = cn(
  actionPrimaryBtnBase,
  "border-[rgba(231,76,60,0.8)]",
  "bg-linear-to-b from-[#ff6b6b] to-[#c0392b] text-white",
  "shadow-[0_0_22px_rgba(231,76,60,0.45),inset_0_1px_0_rgba(255,255,255,0.25)]",
  "hover:shadow-[0_0_30px_rgba(231,76,60,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]",
);

export const customPrimaryBtn = cn(
  actionPrimaryBtnBase,
  "border-[rgba(255,140,66,0.75)]",
  "bg-linear-to-b from-[#ffb347] to-[#e67e22] text-[#1a0e04]",
  "shadow-[0_0_22px_rgba(255,140,66,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]",
  "hover:shadow-[0_0_30px_rgba(255,140,66,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]",
);

export const tournamentPrimaryBtn = cn(
  actionPrimaryBtnBase,
  "border-[rgba(155,89,182,0.75)]",
  "bg-linear-to-b from-[#9b59b6] to-[#6c3483] text-white",
  "shadow-[0_0_22px_rgba(155,89,182,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]",
  "hover:shadow-[0_0_30px_rgba(155,89,182,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]",
);

export const tournamentPrimaryBtnTeal = cn(
  actionPrimaryBtnBase,
  "border-[rgba(26,188,156,0.75)]",
  "bg-linear-to-b from-[#48e5c2] to-[#16a085] text-[#042018]",
  "shadow-[0_0_22px_rgba(26,188,156,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]",
  "hover:shadow-[0_0_30px_rgba(26,188,156,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]",
);

export const tournamentPrimaryBtnIndigo = cn(
  actionPrimaryBtnBase,
  "border-[rgba(108,92,231,0.75)]",
  "bg-linear-to-b from-[#a29bfe] to-[#5f4dd6] text-white",
  "shadow-[0_0_22px_rgba(108,92,231,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]",
  "hover:shadow-[0_0_30px_rgba(108,92,231,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]",
);

export const tournamentPrimaryBtnRose = cn(
  actionPrimaryBtnBase,
  "border-[rgba(232,67,147,0.75)]",
  "bg-linear-to-b from-[#fd79a8] to-[#c4457a] text-white",
  "shadow-[0_0_22px_rgba(232,67,147,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]",
  "hover:shadow-[0_0_30px_rgba(232,67,147,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]",
);

export const tournamentPrimaryBtnGold = cn(
  actionPrimaryBtnBase,
  "border-[rgba(244,208,63,0.9)]",
  "bg-linear-to-b from-[#ffe066] via-[#f4d03f] to-[#d4ac0d] text-[#1a1200]",
  "shadow-[0_0_28px_rgba(244,208,63,0.55),0_0_48px_rgba(255,180,0,0.25),inset_0_1px_0_rgba(255,255,255,0.45)]",
  "hover:shadow-[0_0_36px_rgba(244,208,63,0.75),0_0_56px_rgba(255,180,0,0.35),inset_0_1px_0_rgba(255,255,255,0.55)]",
  "animate-featured-btn-pulse",
);

export const rankedQueued = cn(
  actionPrimaryBtnBase,
  "cursor-default hover:translate-y-0",
  "border-[rgba(230,57,70,0.45)] bg-[rgba(42,16,16,0.95)]",
  "text-red-200 shadow-[0_0_16px_rgba(230,57,70,0.2)]",
);

export const rankedSub = "text-[0.6rem] text-white/50";

export const rankedCancel = cn(
  "mt-0.5 cursor-pointer rounded-md border border-white/15 bg-transparent",
  "px-2.5 py-0.5 font-game text-[0.6rem] text-white/65 transition-colors duration-150",
  "hover:border-white/25 hover:text-white/80",
);

export const connectCardShell = cn(
  "pointer-events-auto flex w-[min(92vw,32rem)] flex-col items-center gap-[clamp(0.65rem,2.5vw,1rem)]",
);

export const connectOverlay = cn(
  "pointer-events-none absolute inset-0 z-[18] flex items-center justify-center px-4",
);

export const connectCard = cn(
  "flex w-full flex-col items-center gap-3 text-center",
  "rounded-2xl border border-red-500/30 bg-[rgba(42,16,16,0.82)]",
  "px-7 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_24px_rgba(230,57,70,0.18)]",
  "backdrop-blur-md",
);

export const connectIcon = cn(
  "shrink-0",
  "[filter:drop-shadow(0_0_18px_rgba(230,57,70,0.55))]",
);

export const connectText = cn(
  "m-0 font-display text-[0.82rem] font-bold leading-snug tracking-wide",
  "text-white/85 uppercase sm:text-[0.9rem]",
);

export const connectWalletBtn = cn(
  "w-full max-w-[min(100%,18rem)] rounded-full border-2 border-red-400/60 px-[clamp(0.85rem,3vw,1.5rem)] py-[clamp(0.55rem,2.5vw,0.75rem)]",
  "bg-linear-to-b from-[#ff6b6b] to-[#b91c1c] font-display text-[clamp(0.72rem,2.8vw,0.875rem)] font-black tracking-wide text-white uppercase",
  "shadow-[0_0_22px_rgba(230,57,70,0.38),inset_0_1px_0_rgba(255,255,255,0.35)]",
  "transition-all duration-150 hover:brightness-110 active:scale-[0.98]",
);

export const guestPlayBtn = cn(
  "w-full max-w-[min(100%,18rem)] rounded-full border-2 border-red-400/35 px-[clamp(0.85rem,3vw,1.5rem)] py-[clamp(0.55rem,2.5vw,0.75rem)]",
  "bg-[rgba(42,16,16,0.88)] font-display text-[clamp(0.72rem,2.8vw,0.875rem)] font-bold tracking-wide text-red-100/90 uppercase",
  "shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-sm",
  "transition-all duration-150 hover:border-red-400/55 hover:text-red-50",
  "hover:shadow-[0_0_18px_rgba(230,57,70,0.35)] active:scale-[0.98]",
);

export const bannerLocked = cn(
  "relative",
);

/** Leve atenuação — conteúdo legível, mas indica bloqueio. */
export const bannerLockedMuted = cn(
  "saturate-[0.78] brightness-[0.94]",
);

export const bannerLockedBadge = cn(
  "inline-flex items-center gap-1 rounded-full border border-amber-400/35",
  "bg-[#1a1208]/90 px-3 py-1 font-game text-[0.82rem] font-bold uppercase",
  "tracking-wide text-amber-200/90",
);

/** Dimmed card body when admin closed / coming soon. */
export const bannerBodyUnavailable = cn(
  "saturate-[0.68] brightness-[0.86]",
);

/** Full-card overlay for the availability band. */
export const bannerStatusBandLayer = cn(
  "pointer-events-none absolute inset-0 z-[45] flex items-center justify-center overflow-hidden",
);

const bannerStatusBandBase = cn(
  "absolute left-1/2 top-1/2 flex w-[130%] -translate-x-1/2 -translate-y-1/2 items-center",
  "border-y-[4px] border-white/28",
  "shadow-[0_12px_44px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.24)]",
);

/** Center card — wide diagonal band across the full banner. */
export const bannerStatusBandCenter = cn(
  bannerStatusBandBase,
  "-rotate-[7deg] py-[clamp(0.7rem,2.8vw,1rem)]",
);

/** Side card — compact band. */
export const bannerStatusBandSide = cn(
  bannerStatusBandBase,
  "w-[120%] -rotate-[5deg] py-[0.4rem]",
);

export const bannerStatusBandTrack = cn(
  "flex min-w-full shrink-0 animate-status-band-scroll",
);

export const bannerStatusBandLine = cn(
  "m-0 shrink-0 whitespace-nowrap px-[0.35em]",
  "font-display text-[clamp(0.82rem,3.6vw,1.35rem)] font-black uppercase leading-none",
  "tracking-[0.42em]",
);

export const bannerStatusBandSoon = cn(
  "bg-[linear-gradient(90deg,rgba(6,36,56,0.97)_0%,rgba(12,132,199,0.98)_35%,rgba(56,189,248,0.98)_50%,rgba(12,132,199,0.98)_65%,rgba(6,36,56,0.97)_100%)]",
  "text-white [text-shadow:0_0_20px_rgba(125,211,252,0.8),0_2px_5px_rgba(0,0,0,0.65)]",
  "border-sky-100/35",
);

export const bannerStatusBandClosed = cn(
  "bg-[linear-gradient(90deg,rgba(56,8,24,0.98)_0%,rgba(159,18,57,0.98)_35%,rgba(244,63,94,0.98)_50%,rgba(159,18,57,0.98)_65%,rgba(56,8,24,0.98)_100%)]",
  "text-white [text-shadow:0_0_20px_rgba(251,113,133,0.82),0_2px_5px_rgba(0,0,0,0.65)]",
  "border-rose-100/32",
);

export const guestWalletPrompt = cn(
  "flex w-[15rem] max-w-full flex-col items-center gap-3 py-1",
);

export const guestWalletHint = cn(
  "m-0 text-center font-game text-[0.62rem] leading-snug font-semibold",
  "text-white/70 line-clamp-4",
);

/** Treino + regras fixos no canto inferior esquerdo do lobby/jogo. */
export const lobbyCornerActions = cn(
  "lobby-corner-actions pointer-events-auto absolute z-[25]",
  "left-[var(--ui-safe-left,var(--ui-edge-inset,clamp(0.85rem,3.5vw,1.35rem)))]",
  "flex flex-wrap items-center gap-2",
);

/** Botão utilitário do canto (treino / regras). */
export const trainingBtn = cn(
  "inline-flex cursor-pointer items-center gap-2 rounded-lg",
  "border border-red-400/50 bg-[rgba(42,16,16,0.94)]",
  "px-3 py-2 font-game text-xs font-bold tracking-wide text-red-200",
  "shadow-[0_0_18px_rgba(230,57,70,0.22)] backdrop-blur-sm",
  "transition-all duration-150 hover:scale-[1.03]",
  "hover:border-red-400/75 hover:shadow-[0_0_24px_rgba(230,57,70,0.38)]",
  "active:scale-[0.98]",
);

/** @deprecated Use lobbyCornerActions — mantido para referência. */
export const trainingCorner = cn(
  trainingBtn,
  lobbyCornerActions,
);

export const lobbyError = cn(
  "absolute bottom-2 left-1/2 z-20 m-0 -translate-x-1/2 text-center",
  "text-[0.85rem] text-[#ff6b6b]",
);

/** Tabuleiro / sala de espera sobre o canvas do lobby (mesma tela). */
export const lobbyStageOverlay = cn(
  "pointer-events-auto absolute inset-0 z-[12] flex h-full w-full flex-col overflow-hidden",
);

export const waitingRoomOverlay = cn(
  "relative flex h-full w-full flex-col items-center justify-center overflow-auto",
  "bg-[radial-gradient(ellipse_90%_70%_at_50%_35%,rgba(61,21,21,0.88),rgba(26,8,8,0.94))]",
  "px-4 py-6 backdrop-blur-[2px] sm:py-8",
);

export const waitingRoomTopBar = cn(
  "pointer-events-auto absolute top-3 right-3 z-10 sm:top-4 sm:right-4",
);

export const waitingRoomShell = cn(
  "relative flex w-full max-w-[min(28rem,94vw)] flex-col items-center gap-5",
);

export const waitingRoomIcon = cn(
  "text-[3.25rem] leading-none select-none",
  "[filter:drop-shadow(0_0_22px_rgba(255,107,53,0.55))]",
);

export const waitingRoomTitle = cn(
  "m-0 font-display text-[1.35rem] font-black tracking-wide text-white uppercase",
  "[text-shadow:0_0_18px_rgba(230,57,70,0.45)] sm:text-[1.5rem]",
);

export const waitingRoomSubtitle = cn(
  "m-0 mt-2 max-w-[22rem] font-game text-[0.82rem] leading-snug font-semibold text-white/65",
);

export const waitingSteps = cn(
  "flex w-full items-start justify-between gap-1 px-1",
);

export const waitingStepItem = cn(
  "flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center",
);

export const waitingStepDot = cn(
  "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
  "font-display text-[0.62rem] font-black transition-all duration-300",
);

export const waitingStepDotDone = cn(
  "border-emerald-400/70 bg-emerald-500/25 text-emerald-200",
  "shadow-[0_0_14px_rgba(46,204,113,0.35)]",
);

export const waitingStepDotActive = cn(
  "border-red-400/80 bg-red-500/20 text-red-100",
  "shadow-[0_0_18px_rgba(230,57,70,0.45)] animate-pulse",
);

export const waitingStepDotPending = cn(
  "border-white/15 bg-white/5 text-white/35",
);

export const waitingStepLabel = cn(
  "font-game text-[0.52rem] font-bold leading-tight tracking-wide text-white/50 uppercase",
  "line-clamp-2 sm:text-[0.58rem]",
);

export const waitingStepLabelActive = "text-red-200/90";

export const waitingStepConnector = cn(
  "mt-3.5 h-0.5 min-w-[0.35rem] flex-1 rounded-full transition-colors duration-300",
);

export const waitingCard = cn(
  "w-full rounded-xl border border-red-500/25",
  "bg-[rgba(6,16,30,0.92)] px-4 py-4",
  "shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_24px_rgba(230,57,70,0.08)]",
  "backdrop-blur-md",
);

export const waitingCardHeader = cn(
  "mb-3 flex items-center justify-between gap-2 border-b border-white/8 pb-3",
);

export const waitingModeBadge = cn(
  "inline-flex rounded-sm px-2 py-0.5 font-display text-[0.58rem] font-black",
  "tracking-[0.14em] text-red-100 uppercase",
  "border border-red-400/50 bg-red-500/15",
);

export const waitingCardRow = cn(
  "flex items-center justify-between gap-3 py-1.5 font-game text-[0.78rem]",
);

export const waitingCardLabel = "shrink-0 text-white/50";

export const waitingCardValue = cn(
  "min-w-0 truncate font-mono text-[0.75rem] font-semibold text-white/90",
);

export const waitingPotValue = cn(
  "font-display text-[1.1rem] font-black text-emerald-400",
  "[text-shadow:0_0_14px_rgba(46,204,113,0.55)]",
);

export const waitingElapsed = cn(
  "mt-2 text-center font-game text-[0.68rem] font-semibold text-white/40",
);

/** Large live countdown until refund-eligible cancel (M:SS). */
export const waitingRefundCountdown = cn(
  "my-1 text-center",
);

export const waitingRefundCountdownValue = cn(
  "font-display text-[1.5rem] font-black tabular-nums leading-none tracking-tight",
  "text-amber-200 [text-shadow:0_0_16px_rgba(245,158,11,0.4)]",
);

export const waitingHint = cn(
  "text-center font-game text-[0.65rem] leading-snug font-semibold text-white/45",
);

export const waitingCopyBtn = cn(
  "shrink-0 cursor-pointer rounded-md border border-white/15 bg-white/5",
  "px-2 py-0.5 font-game text-[0.62rem] font-bold text-red-200/90",
  "transition-colors hover:border-red-400/45 hover:bg-red-500/10",
);

export const waitingCancelBtn = cn(
  "w-full max-w-[16rem] cursor-pointer rounded-full border-2 border-red-400/45",
  "bg-[rgba(40,12,12,0.85)] px-5 py-2.5 font-display text-[0.72rem] font-bold",
  "tracking-wide text-red-200/90 uppercase",
  "shadow-[0_0_16px_rgba(231,76,60,0.2)]",
  "transition-all hover:border-red-400/65 hover:bg-[rgba(60,18,18,0.95)]",
  "active:scale-[0.98]",
);

export const waitingCancelBtnForfeit = cn(
  waitingCancelBtn,
  "border-amber-400/55 text-amber-100/95",
  "shadow-[0_0_16px_rgba(245,158,11,0.25)]",
  "hover:border-amber-300/70 hover:bg-[rgba(50,30,8,0.95)]",
);

export const waitingCancelPolicy = cn(
  "mx-auto w-full max-w-[18rem] rounded-lg border px-3 py-2.5 text-center",
  "font-game text-[0.62rem] leading-snug font-semibold",
);

export const waitingCancelPolicyWarn = cn(
  waitingCancelPolicy,
  "border-amber-400/35 bg-amber-500/10 text-amber-100/90",
);

export const waitingCancelPolicyOk = cn(
  waitingCancelPolicy,
  "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90",
);

export const waitingBackBtn = cn(
  "cursor-pointer border-0 bg-transparent font-game text-[0.72rem] font-semibold",
  "text-white/45 underline-offset-2 transition-colors hover:text-white/70 hover:underline",
);

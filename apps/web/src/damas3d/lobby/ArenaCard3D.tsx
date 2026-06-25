import { useEffect, useRef, type CSSProperties } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { SolAmount } from "@/components/icons/SolanaIcon";
import { cn } from "@/lib/utils";
import { formatSolAmount } from "../../config/bets";
import {
  MIN_BET_SOL,
  MAX_BET_SOL,
  RANKED_MIN_BET_SOL,
  RANKED_MAX_BET_SOL,
  type BetErrorKey,
} from "../../config/bets";
import { BetAmountStepper } from "./BetAmountStepper";
import {
  bannerBase,
  bannerCenter,
  bannerHeight,
  bannerInteractive,
  bannerWidth,
  cardBadge,
  cardBadgeFeatured,
  cardStats,
  cardSub,
  cardTitle,
  cardTitleFeatured,
  cardTitleNear,
  customErr,
  customLabel,
  customRow,
  rankedPresetRow,
  rankedPresetChip,
  rankedPresetChipActive,
  cyberBody,
  cyberBodyFeatured,
  cyberBodySide,
  cyberCorner,
  cyberStripe,
  cyberStripeText,
  entryCompact,
  entryCompactStrong,
  entryStrong,
  bannerFeatured,
  bannerLocked,
  bannerLockedMuted,
  bannerLockedBadge,
  bannerStatusBandLayer,
  bannerStatusBandCenter,
  bannerStatusBandSide,
  bannerStatusBandTrack,
  bannerStatusBandLine,
  bannerStatusBandSoon,
  bannerStatusBandClosed,
  bannerBodyUnavailable,
  prizeBlock,
  prizeBlockCompact,
  prizeLabel,
  prizeValue,
  prizeValueFeatured,
  prizeValueCompact,
  statWaiting,
  statRanked,
  statTournamentBase,
  statFeatured,
  statCustom,
} from "./lobbyClasses";
import { ARENA_ACCENT_COLORS } from "./dopamineColors";
import {
  carouselSpacing,
  hitBoxSize,
  htmlDistanceFactor,
  useLobbyViewportTier,
  type LobbyViewportTier,
} from "./lobbyCarouselLayout";
import { usePortraitMobile } from "../../hooks/usePortraitMobile";
import { accentStatStyle } from "./tournamentStyles";
import { RatingModeBadge } from "@/components/rating/RatingModeBadge";

export interface ArenaCardData {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  prize: string;
  waiting: number;
  entry: string;
  accentIndex: number;
  accentColor?: string;
  isRanked?: boolean;
  isRankedPresets?: boolean;
  rankedPresets?: readonly number[];
  selectedPresetSol?: number;
  onSelectPreset?: (sol: number) => void;
  rankedTagline?: string;
  isTournament?: boolean;
  isFeatured?: boolean;
  tournamentSize?: number;
  tournamentTagline?: string;
  isCustom?: boolean;
  isRankedStake?: boolean;
  customInput?: string;
  stakeInput?: string;
  customError?: BetErrorKey | null;
  stakeError?: BetErrorKey | null;
  onCustomInput?: (raw: string) => void;
  onStakeInput?: (raw: string) => void;
  isFreeCasual?: boolean;
  locked?: boolean;
  /** Admin-controlled warning when mode is not open. */
  modeStatus?: "coming_soon" | "closed" | null;
  countsForRating?: boolean;
  myRating?: number;
  myGamesPlayed?: number;
  ratingMultiplier?: number;
}

interface ArenaCard3DProps {
  data: ArenaCardData;
  offset: number;
  locked?: boolean;
  onSelect: () => void;
}

const CAROUSEL_EASE = 3.1;

function buildStatusBandLabel(label: string, repeats = 6): string {
  const chunk = label.toUpperCase();
  return `${chunk}   ·   `.repeat(repeats).trim();
}

function cardScale(
  offset: number,
  featured = false,
  tier: LobbyViewportTier = "desktop",
): number {
  const abs = Math.abs(offset);
  if (tier === "mobile") {
    return 1;
  }
  if (tier === "tablet") {
    if (abs === 0) return featured ? 1.08 : 1.05;
    if (abs === 1) return featured ? 0.98 : 0.96;
    return featured ? 0.9 : 0.88;
  }
  if (abs === 0) return featured ? 1.16 : 1.12;
  if (abs === 1) return featured ? 1.02 : 0.98;
  return featured ? 0.88 : 0.84;
}

function cardTarget(
  offset: number,
  spacing: number,
  featured = false,
  tier: LobbyViewportTier = "desktop",
) {
  const z =
    tier === "mobile"
      ? offset === 0
        ? 0.2
        : -Math.abs(offset) * 0.55
      : -Math.abs(offset) * 0.35;
  return {
    x: offset * spacing,
    z,
    scale: cardScale(offset, featured, tier),
    rotY: tier === "mobile" ? offset * -0.03 : offset * -0.05,
  };
}

export function ArenaCard3D({ data, offset, locked = false, onSelect }: ArenaCard3DProps) {
  const { t } = useTranslation();
  const tier = useLobbyViewportTier();
  const portrait = usePortraitMobile();
  const spacing = carouselSpacing(tier);
  const hitBox = hitBoxSize(tier);
  const groupRef = useRef<THREE.Group>(null);
  const isCenter = offset === 0;
  const isNear = Math.abs(offset) === 1;
  const visible = Math.abs(offset) <= 1;
  const isLocked = locked || data.locked;
  const accent =
    data.accentColor ??
    ARENA_ACCENT_COLORS[data.accentIndex % ARENA_ACCENT_COLORS.length];

  const isFeatured = data.isFeatured ?? false;
  const statusBandLabel =
    data.modeStatus === "coming_soon"
      ? buildStatusBandLabel(t("modes.status.comingSoon"))
      : data.modeStatus === "closed"
        ? buildStatusBandLabel(t("modes.status.closed"))
        : null;

  const target = useRef(cardTarget(offset, spacing, isFeatured, tier));

  useEffect(() => {
    target.current = cardTarget(offset, spacing, isFeatured, tier);
  }, [offset, spacing, isFeatured, tier]);

  useFrame((_, delta) => {
    if (!groupRef.current || !visible) return;
    const g = groupRef.current;
    const tgt = target.current;
    const t = 1 - Math.exp(-CAROUSEL_EASE * delta);
    g.position.x = THREE.MathUtils.lerp(g.position.x, tgt.x, t);
    g.position.z = THREE.MathUtils.lerp(g.position.z, tgt.z, t);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, tgt.rotY, t);
    const s = THREE.MathUtils.lerp(g.scale.x, tgt.scale, t);
    g.scale.setScalar(s);
  });

  if (!visible) return null;

  const cssVars = { "--card-accent": accent } as CSSProperties;
  const initial = cardTarget(offset, spacing, isFeatured, tier);
  const cardLiftY = tier === "mobile" ? 0.12 : 0.35;

  const handleSideSelect = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!isCenter) onSelect();
  };

  return (
    <group
      ref={groupRef}
      position={[initial.x, cardLiftY, initial.z]}
      scale={initial.scale}
      rotation={[0, initial.rotY, 0]}
      onClick={handleSideSelect}
      onPointerOver={() => {
        if (!isCenter) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <mesh onClick={handleSideSelect}>
        <boxGeometry args={hitBox} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Html
        center
        transform={false}
        distanceFactor={htmlDistanceFactor(offset, tier, portrait)}
        position={[0, 0, 0.02]}
        zIndexRange={[isCenter ? 18 : 14 - Math.abs(offset), 0]}
        style={{
          pointerEvents: "auto",
          userSelect: "none",
        }}
      >
        <div
          className={cn(
            bannerBase,
            bannerWidth(isCenter, isNear, tier),
            isCenter ? bannerCenter : bannerInteractive,
            isCenter && isFeatured && bannerFeatured,
            isCenter && tier !== "mobile" && "translate-x-[clamp(0.15rem,1vw,0.45rem)]",
          )}
          style={cssVars}
          role={!isCenter ? "button" : undefined}
          tabIndex={!isCenter ? 0 : undefined}
          onClick={handleSideSelect}
          onPointerDown={(e) => {
            if (!isCenter) e.stopPropagation();
          }}
          onKeyDown={(e) => {
            if (!isCenter && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onSelect();
            }
          }}
        >
          {isCenter && tier !== "mobile" && (
            <div className={cyberStripe} aria-hidden>
              <span className={cyberStripeText}>
                {data.title.replace(/\s+/g, " ")}
              </span>
            </div>
          )}

          <div
            className={cn(
              isFeatured && isCenter ? cyberBodyFeatured : cyberBody,
              bannerHeight(isCenter, isNear, tier),
              (!isCenter || tier === "mobile") && cyberBodySide,
              isLocked && isCenter && bannerLocked,
              isLocked && isCenter && !data.modeStatus && bannerLockedMuted,
              data.modeStatus && isCenter && bannerBodyUnavailable,
            )}
          >
            <div className={cn(cyberCorner, "top-1 left-1 border-t-2 border-l-2")} />
            <div className={cn(cyberCorner, "top-1 right-1 border-t-2 border-r-2")} />
            <div className={cn(cyberCorner, "bottom-1 left-1 border-b-2 border-l-2")} />
            <div className={cn(cyberCorner, "bottom-1 right-1 border-b-2 border-r-2")} />

            <span className={isFeatured ? cardBadgeFeatured : cardBadge}>
              {data.badge}
            </span>
            <h2
              className={cn(
                cardTitle,
                isFeatured && isCenter && cardTitleFeatured,
                !isCenter && tier !== "mobile" && cardTitleNear,
              )}
            >
              {data.title}
            </h2>

            {isCenter ? (
              <>
                <p className={cardSub}>{data.subtitle}</p>
                <RatingModeBadge
                  countsForRating={data.countsForRating ?? false}
                  myRating={data.myRating}
                  myGamesPlayed={data.myGamesPlayed}
                  isTournament={data.isTournament}
                  ratingMultiplier={data.ratingMultiplier}
                  className="arena-rating-mode-badge"
                />
                {!data.isFreeCasual && (
                  <div className={prizeBlock}>
                    <span className={prizeLabel}>
                      {t("arena.prize").toUpperCase()}
                    </span>
                    <span
                      className={cn(
                        prizeValue,
                        isFeatured && isCenter && prizeValueFeatured,
                      )}
                    >
                      <SolAmount amount={data.prize} iconClassName="size-6" />
                    </span>
                  </div>
                )}
                <div className={cardStats}>
                  {data.isRanked && data.isRankedStake ? (
                    <span className={statCustom}>
                      {t("arena.waiting", { count: data.waiting })}
                    </span>
                  ) : data.isRanked ? (
                    <span className={statRanked}>{data.rankedTagline}</span>
                  ) : data.isTournament ? (
                    <span
                      className={
                        isFeatured ? statFeatured : statTournamentBase
                      }
                      style={
                        isFeatured ? undefined : accentStatStyle(accent)
                      }
                    >
                      {data.tournamentTagline}
                    </span>
                  ) : data.isCustom ? (
                    <span className={statCustom}>
                      {t("arena.waiting", { count: data.waiting })}
                    </span>
                  ) : (
                    <span className={statWaiting}>
                      {t("arena.waiting", { count: data.waiting })}
                    </span>
                  )}
                  {(data.isCustom || data.isRankedStake) &&
                  (data.onCustomInput || data.onStakeInput) &&
                  !isLocked ? (
                    <div className={customRow}>
                      <label className={customLabel}>
                        {t("arena.entryFee")}
                      </label>
                      <BetAmountStepper
                        variant={data.isRankedStake ? "ranked" : "custom"}
                        value={data.stakeInput ?? data.customInput ?? ""}
                        onChange={(raw) =>
                          data.onStakeInput?.(raw) ?? data.onCustomInput?.(raw)
                        }
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                      {(data.stakeError ?? data.customError) && (
                        <span className={customErr}>
                          {t(
                            `errors.bet.${data.stakeError ?? data.customError}`,
                            {
                              min: data.isRankedStake
                                ? RANKED_MIN_BET_SOL
                                : MIN_BET_SOL,
                              max: data.isRankedStake
                                ? RANKED_MAX_BET_SOL
                                : MAX_BET_SOL,
                            },
                          )}
                        </span>
                      )}
                    </div>
                  ) : data.isRankedPresets &&
                    data.rankedPresets &&
                    data.onSelectPreset &&
                    !isLocked ? (
                    <div className={customRow}>
                      <label className={customLabel}>
                        {t("arena.selectStake")}
                      </label>
                      <div className={rankedPresetRow}>
                        {data.rankedPresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className={cn(
                              rankedPresetChip,
                              data.selectedPresetSol === preset &&
                                rankedPresetChipActive,
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              data.onSelectPreset?.(preset);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            {formatSolAmount(preset)} SOL
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span>
                      {data.isCustom || data.isRankedStake ? (
                        <>
                          {t("arena.entryFee")}{" "}
                          <strong className={entryStrong}>
                            <SolAmount amount={data.entry} iconClassName="size-5" />
                          </strong>
                        </>
                      ) : (
                        <>
                          {t("arena.entry")}{" "}
                          <strong className={entryStrong}>
                            {data.isFreeCasual ? (
                              t("arena.free")
                            ) : (
                              <SolAmount amount={data.entry} iconClassName="size-5" />
                            )}
                          </strong>
                        </>
                      )}
                    </span>
                  )}
                  {isLocked && isCenter && !data.modeStatus && (
                    <span className={bannerLockedBadge}>
                      <span aria-hidden>🔒</span>
                      {t("arena.walletRequired")}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <RatingModeBadge
                  countsForRating={data.countsForRating ?? false}
                  myRating={data.myRating}
                  myGamesPlayed={data.myGamesPlayed}
                  isTournament={data.isTournament}
                  ratingMultiplier={data.ratingMultiplier}
                  variant="compact"
                  className="arena-rating-mode-badge-side"
                />
                {!data.isFreeCasual && (
                  <div className={cn(prizeBlock, prizeBlockCompact)}>
                    <span className={prizeLabel}>
                      {t("arena.prize").toUpperCase()}
                    </span>
                    <span className={cn(prizeValue, prizeValueCompact)}>
                      <SolAmount amount={data.prize} iconClassName="size-5" />
                    </span>
                  </div>
                )}
                <span className={entryCompact}>
                  {t("arena.entry")}{" "}
                  <strong className={entryCompactStrong}>
                    {data.isFreeCasual ? (
                      t("arena.free")
                    ) : (
                      <SolAmount amount={data.entry} iconClassName="size-4" />
                    )}
                  </strong>
                </span>
              </>
            )}
          </div>

          {statusBandLabel && (
            <div className={bannerStatusBandLayer} aria-live="polite">
              <div
                className={cn(
                  isCenter ? bannerStatusBandCenter : bannerStatusBandSide,
                  data.modeStatus === "coming_soon"
                    ? bannerStatusBandSoon
                    : bannerStatusBandClosed,
                )}
              >
                <div className={bannerStatusBandTrack}>
                  <p className={bannerStatusBandLine}>{statusBandLabel}</p>
                  <p className={bannerStatusBandLine} aria-hidden>
                    {statusBandLabel}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

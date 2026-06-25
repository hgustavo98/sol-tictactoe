import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import {
  SOCKET_EVENTS,
  type LobbyMatch,
} from "@sol-tictactoe/shared";
import type { Socket } from "socket.io-client";
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { fadeUp } from "@/components/motion/ViewTransition";
import {
  BET_ARENAS,
  validateBetSol,
} from "../config/bets";
import { useEscrow } from "../hooks/useEscrow";
import { BetArenaCarousel } from "./arena/BetArenaCarousel";
import { BrandLogo } from "./icons/BrandLogo";
import { OpenTablesList } from "./arena/OpenTablesList";
import { PlayOneVsOne, formatPlayEntryLabel } from "./arena/PlayOneVsOne";

interface LobbyProps {
  socket: Socket;
  lobbies: LobbyMatch[];
  houseRakeBps: number;
  onCreated: (matchId: string, onChainAddress: string, betLamports: number) => void;
  onJoined: (matchId: string) => void;
}

export function Lobby({
  socket,
  lobbies,
  houseRakeBps,
  onCreated,
  onJoined,
}: LobbyProps) {
  const { publicKey } = useWallet();
  const { createMatch, joinMatch } = useEscrow();

  const [betSol, setBetSol] = useState(BET_ARENAS[0].betSol);
  const [customMode, setCustomMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = publicKey?.toBase58();

  const handleCreate = async () => {
    if (!socket || !wallet) return;
    const err = validateBetSol(betSol);
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const matchId = crypto.randomUUID();
      const result = await createMatch(betSol, undefined, matchId);
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE, {
        matchId,
        wallet,
        betLamports: result.betLamports,
        onChainAddress: result.matchPda,
      });
      socket.once(SOCKET_EVENTS.LOBBY_CREATE, (lobby: LobbyMatch) => {
        onCreated(lobby.id, result.matchPda, result.betLamports);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create match");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (lobby: LobbyMatch) => {
    if (!socket || !wallet) return;
    setLoading(true);
    setError(null);
    try {
      const onChain = lobby.onChainAddress ?? lobby.id;
      await joinMatch(
        onChain,
        lobby.betLamports,
        lobby.tokenMint ?? undefined,
        lobby.id,
      );
      socket.emit(SOCKET_EVENTS.LOBBY_JOIN, {
        matchId: lobby.id,
        wallet,
        onChainAddress: onChain,
      });
      socket.once(SOCKET_EVENTS.LOBBY_JOIN, (joined: LobbyMatch) => {
        onJoined(joined.id);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lobby-shell">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="lobby-hero"
      >
        <div className="lobby-logo flex flex-col items-center gap-3 text-center">
          <BrandLogo size={64} />
          <div>
            <h1 className="lobby-logo-title profile-brand">SOL TTT</h1>
            <p className="lobby-logo-tag">1v1 · SOL stakes</p>
          </div>
        </div>

        {!wallet ? (
          <Card className="mx-auto max-w-sm border-white/10 bg-black/30 backdrop-blur-md">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <Wallet className="size-10 text-primary" />
              <p className="text-sm text-white/70">
                Connect your wallet to play 1v1 for SOL
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <BetArenaCarousel
              houseRakeBps={houseRakeBps}
              lobbies={lobbies}
              selectedBetSol={betSol}
              onSelectBet={setBetSol}
              customMode={customMode}
              onCustomModeChange={setCustomMode}
            />

            <PlayOneVsOne
              disabled={!wallet || !!validateBetSol(betSol)}
              loading={loading}
              onPlay={() => void handleCreate()}
              betLabel={formatPlayEntryLabel(betSol)}
            />
          </>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="lobby-error"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      <OpenTablesList
        lobbies={lobbies}
        playerId={wallet}
        loading={loading}
        onJoin={(l) => void handleJoin(l)}
      />
    </div>
  );
}

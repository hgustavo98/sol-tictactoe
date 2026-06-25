import { randomUUID } from "crypto";
import { MongoClient, type Collection, type Db, type Document } from "mongodb";
import {
  DEFAULT_RATING,
  normalizeNicknameKey,
  type MatchReceipt,
  type PlayerProfile,
} from "@sol-tictactoe/shared";
import type {
  AdminSessionRecord,
  BankLedgerEntry,
  BankLedgerType,
  ClientGameRow,
  ClientSummary,
  DailyVisitRow,
  DataStore,
  DbStats,
  GameModeStatRow,
  GuestSessionRecord,
  MatchLogEntry,
  PersistedActiveMatch,
  PlayerSessionRecord,
  RecentGameRow,
} from "./types";
import { createBankEntry } from "./bank-ledger";
import { escapeMongoRegex, mongoRegexFilter } from "../utils/mongo-regex";

export { createBankEntry };

export class MongoStore implements DataStore {
  readonly provider = "mongodb" as const;
  private client!: MongoClient;
  private db!: Db;

  constructor(private readonly uri: string) {}

  async connect(): Promise<void> {
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    this.db = this.client.db();
    await this.ensureIndexes();
  }

  async close(): Promise<void> {
    await this.client?.close();
  }

  private col(name: string): Collection<Document> {
    return this.db.collection(name);
  }

  private async ensureIndexes(): Promise<void> {
    await Promise.all([
      this.col("receipts").createIndex({ matchId: 1 }, { unique: true }),
      this.col("receipts").createIndex({ createdAt: -1 }),
      this.col("players").createIndex({ wallet: 1 }, { unique: true }),
      this.col("players").createIndex({ rating: -1 }),
      this.col("players").createIndex(
        { nicknameKey: 1 },
        { unique: true, sparse: true },
      ),
      this.col("match_log").createIndex({ matchId: 1, createdAt: -1 }),
      this.col("app_settings").createIndex({ key: 1 }, { unique: true }),
      this.col("admin_audit").createIndex({ createdAt: -1 }),
      this.col("bank_ledger").createIndex({ createdAt: -1 }),
      this.col("bank_ledger").createIndex({ matchId: 1 }),
      this.col("bank_ledger").createIndex({ type: 1 }),
      this.col("admin_sessions").createIndex({ token: 1 }, { unique: true }),
      this.col("admin_sessions").createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 },
      ),
      this.col("player_sessions").createIndex({ token: 1 }, { unique: true }),
      this.col("player_sessions").createIndex({ wallet: 1 }),
      this.col("player_sessions").createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 },
      ),
      this.col("site_daily_stats").createIndex({ day: 1 }, { unique: true }),
      this.col("site_visitor_day").createIndex(
        { day: 1, visitorId: 1 },
        { unique: true },
      ),
      this.col("site_visitor_day").createIndex({ day: 1 }),
      this.col("active_matches").createIndex({ matchId: 1 }, { unique: true }),
      this.col("active_matches").createIndex({ kind: 1, updatedAt: -1 }),
      this.col("rate_limits").createIndex({ key: 1 }, { unique: true }),
      this.col("rate_limits").createIndex(
        { resetAt: 1 },
        { expireAfterSeconds: 0 },
      ),
      this.col("guest_sessions").createIndex({ token: 1 }, { unique: true }),
      this.col("guest_sessions").createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 },
      ),
      this.col("guest_sessions").createIndex({ socketId: 1 }, { sparse: true }),
    ]);
  }

  private utcDay(ts = Date.now()): string {
    return new Date(ts).toISOString().slice(0, 10);
  }

  async saveReceipt(receipt: MatchReceipt): Promise<void> {
    await this.col("receipts").updateOne(
      { matchId: receipt.matchId },
      { $set: receipt as Document },
      { upsert: true },
    );
  }

  async getReceipts(limit: number): Promise<MatchReceipt[]> {
    const rows = await this.col("receipts")
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return rows as unknown as MatchReceipt[];
  }

  async getReceiptsForWallet(
    wallet: string,
    limit: number,
  ): Promise<MatchReceipt[]> {
    const rows = await this.col("receipts")
      .find({
        $or: [{ playerWhite: wallet }, { playerBlack: wallet }],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return rows as unknown as MatchReceipt[];
  }

  async getReceiptsPaginated(
    limit: number,
    offset: number,
  ): Promise<{ items: MatchReceipt[]; total: number }> {
    const col = this.col("receipts");
    const [total, items] = await Promise.all([
      col.countDocuments(),
      col.find().sort({ createdAt: -1 }).skip(offset).limit(limit).toArray(),
    ]);
    return { total, items: items as unknown as MatchReceipt[] };
  }

  async logMatchEvent(
    matchId: string,
    event: string,
    payload?: unknown,
  ): Promise<void> {
    await this.col("match_log").insertOne({
      id: randomUUID(),
      matchId,
      event,
      payload: payload ?? null,
      createdAt: Date.now(),
    });
  }

  async getMatchLog(opts: {
    matchId?: string;
    limit?: number;
    offset?: number;
  }): Promise<MatchLogEntry[]> {
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    const filter = opts.matchId ? { matchId: opts.matchId } : {};
    const rows = await this.col("match_log")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    return rows as unknown as MatchLogEntry[];
  }

  async getOrCreatePlayer(wallet: string): Promise<PlayerProfile> {
    const col = this.col("players");
    const existing = (await col.findOne({ wallet })) as PlayerProfile | null;
    if (existing) return existing;
    const profile: PlayerProfile = {
      wallet,
      rating: DEFAULT_RATING,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      updatedAt: Date.now(),
    };
    await col.insertOne(profile as Document);
    return profile;
  }

  async getPlayerProfile(wallet: string): Promise<PlayerProfile | null> {
    return (await this.col("players").findOne(
      { wallet },
      { projection: { _id: 0, nicknameKey: 0 } },
    )) as PlayerProfile | null;
  }

  async updatePlayerStats(
    wallet: string,
    result: { rating: number; won: boolean; lost: boolean; drew: boolean },
  ): Promise<PlayerProfile> {
    await this.getOrCreatePlayer(wallet);
    await this.col("players").updateOne(
      { wallet },
      {
        $set: { rating: result.rating, updatedAt: Date.now() },
        $inc: {
          gamesPlayed: 1,
          wins: result.won ? 1 : 0,
          losses: result.lost ? 1 : 0,
          draws: result.drew ? 1 : 0,
        },
      } as Document,
    );
    return this.getOrCreatePlayer(wallet);
  }

  async updatePlayerRating(
    wallet: string,
    rating: number,
  ): Promise<PlayerProfile> {
    await this.getOrCreatePlayer(wallet);
    await this.col("players").updateOne(
      { wallet },
      { $set: { rating, updatedAt: Date.now() } },
    );
    return this.getOrCreatePlayer(wallet);
  }

  async seedBotProfile(
    wallet: string,
    profile: {
      nickname: string;
      rating: number;
      gamesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
      avatarUrl?: string | null;
    },
  ): Promise<void> {
    const $set: Document = {
      wallet,
      nickname: profile.nickname,
      rating: profile.rating,
      gamesPlayed: profile.gamesPlayed,
      wins: profile.wins,
      losses: profile.losses,
      draws: profile.draws,
      updatedAt: Date.now(),
    };
    if (profile.avatarUrl !== undefined) {
      $set.avatarUrl = profile.avatarUrl;
    }
    await this.col("players").updateOne({ wallet }, { $set }, { upsert: true });
  }

  async getPlayersPaginated(
    limit: number,
    offset: number,
  ): Promise<{ items: PlayerProfile[]; total: number }> {
    const col = this.col("players");
    const [total, items] = await Promise.all([
      col.countDocuments(),
      col
        .find()
        .sort({ rating: -1, gamesPlayed: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
    ]);
    return { total, items: items as unknown as PlayerProfile[] };
  }

  async isNicknameTaken(
    nicknameKey: string,
    excludeWallet?: string,
  ): Promise<boolean> {
    const filter: Document = { nicknameKey };
    if (excludeWallet) filter.wallet = { $ne: excludeWallet };
    const row = await this.col("players").findOne(filter, { projection: { wallet: 1 } });
    return Boolean(row);
  }

  async updatePlayerProfile(
    wallet: string,
    input: { nickname?: string | null; avatarUrl?: string | null },
  ): Promise<PlayerProfile> {
    await this.getOrCreatePlayer(wallet);
    const $set: Document = { updatedAt: Date.now() };
    if (input.nickname !== undefined) {
      $set.nickname = input.nickname;
      $set.nicknameKey = input.nickname
        ? normalizeNicknameKey(input.nickname)
        : null;
    }
    if (input.avatarUrl !== undefined) {
      $set.avatarUrl = input.avatarUrl;
    }
    await this.col("players").updateOne({ wallet }, { $set });
    return this.getOrCreatePlayer(wallet);
  }

  async searchPlayers(query: string, limit: number): Promise<PlayerProfile[]> {
    const q = query.trim();
    const regex = mongoRegexFilter(q);
    const items = await this.col("players")
      .find(
        {
          $or: [{ wallet: regex }, { nickname: regex }, { nicknameKey: regex }],
        },
        { projection: { _id: 0, nicknameKey: 0 } },
      )
      .sort({ gamesPlayed: -1, rating: -1 })
      .limit(limit)
      .toArray();
    return items as unknown as PlayerProfile[];
  }

  async getPlayerProfilesBatch(wallets: string[]): Promise<PlayerProfile[]> {
    if (wallets.length === 0) return [];
    const items = (await this.col("players")
      .find({ wallet: { $in: wallets } }, { projection: { _id: 0, nicknameKey: 0 } })
      .toArray()) as unknown as PlayerProfile[];
    const byWallet = new Map(items.map((p) => [p.wallet, p]));
    return wallets.map(
      (w) =>
        byWallet.get(w) ?? {
          wallet: w,
          rating: DEFAULT_RATING,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          updatedAt: Date.now(),
          nickname: null,
          avatarUrl: null,
        },
    );
  }

  async getSetting(key: string): Promise<string | null> {
    const row = (await this.col("app_settings").findOne({ key })) as
      | { value: string }
      | null;
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.col("app_settings").updateOne(
      { key },
      { $set: { key, value, updatedAt: Date.now() } },
      { upsert: true },
    );
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const rows = (await this.col("app_settings").find().toArray()) as unknown as {
      key: string;
      value: string;
    }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async logAdminAction(
    action: string,
    payload?: unknown,
    actor?: string,
  ): Promise<void> {
    await this.col("admin_audit").insertOne({
      id: randomUUID(),
      action,
      payload: payload ?? null,
      actor: actor ?? null,
      createdAt: Date.now(),
    });
  }

  async getDbStats(): Promise<DbStats> {
    const [receipts, players, matchLogEvents, bankEntries] = await Promise.all([
      this.col("receipts").countDocuments(),
      this.col("players").countDocuments(),
      this.col("match_log").countDocuments(),
      this.col("bank_ledger").countDocuments(),
    ]);
    const rakeAgg = await this.col("receipts")
      .aggregate<{ total: number }>([
        { $group: { _id: null, total: { $sum: "$rakeLamports" } } },
      ])
      .toArray();
    const bankAgg = await this.col("bank_ledger")
      .aggregate<{ total: number }>([
        { $group: { _id: null, total: { $sum: "$lamports" } } },
      ])
      .toArray();
    return {
      receipts,
      players,
      matchLogEvents,
      totalRakeLamports: rakeAgg[0]?.total ?? 0,
      bankEntries,
      totalBankLamports: bankAgg[0]?.total ?? 0,
    };
  }

  async recordBankEntry(entry: BankLedgerEntry): Promise<void> {
    await this.col("bank_ledger").updateOne(
      { id: entry.id },
      { $set: entry as Document },
      { upsert: true },
    );
  }

  async getBankLedger(opts: {
    limit?: number;
    offset?: number;
    matchId?: string;
    type?: BankLedgerType;
  }): Promise<{ items: BankLedgerEntry[]; total: number }> {
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    const filter: Record<string, unknown> = {};
    if (opts.matchId) filter.matchId = opts.matchId;
    if (opts.type) filter.type = opts.type;
    const col = this.col("bank_ledger");
    const [total, items] = await Promise.all([
      col.countDocuments(filter),
      col
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
    ]);
    return { total, items: items as unknown as BankLedgerEntry[] };
  }

  async sumBankLedgerLamports(opts: {
    types: BankLedgerType[];
    wallet?: string;
    since?: number;
  }): Promise<number> {
    if (opts.types.length === 0) return 0;
    const filter: Record<string, unknown> = { type: { $in: opts.types } };
    if (opts.wallet) filter.wallet = opts.wallet;
    if (opts.since != null) filter.createdAt = { $gte: opts.since };
    const agg = await this.col("bank_ledger")
      .aggregate<{ total: number }>([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$lamports" } } },
      ])
      .toArray();
    return agg[0]?.total ?? 0;
  }

  async createSession(session: AdminSessionRecord): Promise<void> {
    await this.col("admin_sessions").updateOne(
      { token: session.token },
      { $set: session as Document },
      { upsert: true },
    );
  }

  async getSession(token: string): Promise<AdminSessionRecord | null> {
    const session = (await this.col("admin_sessions").findOne({
      token,
    })) as AdminSessionRecord | null;
    if (!session || session.expiresAt < Date.now()) {
      if (session) await this.deleteSession(token);
      return null;
    }
    return session;
  }

  async deleteSession(token: string): Promise<void> {
    await this.col("admin_sessions").deleteOne({ token });
  }

  async createPlayerSession(session: PlayerSessionRecord): Promise<void> {
    await this.col("player_sessions").updateOne(
      { token: session.token },
      { $set: session as Document },
      { upsert: true },
    );
  }

  async getPlayerSession(token: string): Promise<PlayerSessionRecord | null> {
    const session = (await this.col("player_sessions").findOne({
      token,
    })) as PlayerSessionRecord | null;
    if (!session || session.expiresAt < Date.now()) {
      if (session) await this.deletePlayerSession(token);
      return null;
    }
    return session;
  }

  async deletePlayerSession(token: string): Promise<void> {
    await this.col("player_sessions").deleteOne({ token });
  }

  async recordSiteVisit(visitorId: string): Promise<void> {
    const day = this.utcDay();
    await this.col("site_daily_stats").updateOne(
      { day },
      { $inc: { pageViews: 1 }, $setOnInsert: { day, uniqueVisitors: 0 } },
      { upsert: true },
    );
    const visitorResult = await this.col("site_visitor_day").updateOne(
      { day, visitorId },
      { $setOnInsert: { day, visitorId, firstSeenAt: Date.now() } },
      { upsert: true },
    );
    if (visitorResult.upsertedCount === 1) {
      await this.col("site_daily_stats").updateOne(
        { day },
        { $inc: { uniqueVisitors: 1 } },
      );
    }
  }

  async getDailyVisits(days: number): Promise<DailyVisitRow[]> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));
    const sinceDay = since.toISOString().slice(0, 10);
    const rows = await this.col("site_daily_stats")
      .find({ day: { $gte: sinceDay } })
      .sort({ day: -1 })
      .toArray();
    return rows.map((row) => ({
      day: String(row.day),
      pageViews: Number(row.pageViews ?? 0),
      uniqueVisitors: Number(row.uniqueVisitors ?? 0),
    }));
  }

  async getClientsWithStats(opts: {
    limit: number;
    offset: number;
    search?: string;
  }): Promise<{ items: ClientSummary[]; total: number }> {
    const search = opts.search?.trim();
    const matchStage: Record<string, unknown> = {};
    if (search) {
      const pattern = escapeMongoRegex(search);
      matchStage.$or = [
        { wallet: { $regex: pattern, $options: "i" } },
        { nickname: { $regex: pattern, $options: "i" } },
      ];
    }

    const pipeline: Document[] = [
      ...(search ? [{ $match: matchStage }] : []),
      {
        $lookup: {
          from: "receipts",
          let: { w: "$wallet" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$playerWhite", "$$w"] },
                    { $eq: ["$playerBlack", "$$w"] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalSpentLamports: { $sum: "$betLamports" },
                paidGames: { $sum: 1 },
                lastGameAt: { $max: "$createdAt" },
              },
            },
          ],
          as: "receiptStats",
        },
      },
      {
        $addFields: {
          receiptStats: { $arrayElemAt: ["$receiptStats", 0] },
        },
      },
      {
        $project: {
          wallet: 1,
          nickname: 1,
          rating: 1,
          gamesPlayed: 1,
          wins: 1,
          losses: 1,
          draws: 1,
          totalSpentLamports: {
            $ifNull: ["$receiptStats.totalSpentLamports", 0],
          },
          paidGames: { $ifNull: ["$receiptStats.paidGames", 0] },
          lastGameAt: "$receiptStats.lastGameAt",
          lastSeenAt: "$updatedAt",
        },
      },
      { $sort: { updatedAt: -1 } },
      { $skip: opts.offset },
      { $limit: opts.limit },
    ];

    const col = this.col("players");
    const [total, items] = await Promise.all([
      search ? col.countDocuments(matchStage) : col.countDocuments(),
      col.aggregate(pipeline).toArray(),
    ]);
    return { total, items: items as unknown as ClientSummary[] };
  }

  async getClientDetail(wallet: string): Promise<{
    profile: PlayerProfile;
    totalSpentLamports: number;
    paidGames: number;
    recentGames: ClientGameRow[];
  } | null> {
    const profile = await this.getPlayerProfile(wallet);
    if (!profile) return null;

    const receipts = (await this.col("receipts")
      .find({ $or: [{ playerWhite: wallet }, { playerBlack: wallet }] })
      .sort({ createdAt: -1 })
      .limit(25)
      .toArray()) as unknown as MatchReceipt[];

    const matchIds = receipts.map((r) => r.matchId);
    const lobbyEvents =
      matchIds.length > 0
        ? await this.col("match_log")
            .find({ matchId: { $in: matchIds }, event: "lobby_created" })
            .toArray()
        : [];

    const lobbyModeMap = new Map<string, string>();
    for (const event of lobbyEvents) {
      const payload = event.payload as { gameMode?: string } | null;
      lobbyModeMap.set(
        String(event.matchId),
        payload?.gameMode ? String(payload.gameMode) : "unknown",
      );
    }

    const recentGames = receipts.map((r) =>
      this.receiptToGameRow(r, wallet, lobbyModeMap.get(r.matchId)),
    );

    const spendAgg = await this.col("receipts")
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            $or: [{ playerWhite: wallet }, { playerBlack: wallet }],
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$betLamports" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    return {
      profile,
      totalSpentLamports: spendAgg[0]?.total ?? 0,
      paidGames: spendAgg[0]?.count ?? 0,
      recentGames,
    };
  }

  private receiptToGameRow(
    receipt: MatchReceipt,
    perspectiveWallet: string,
    gameMode?: string,
  ): ClientGameRow {
    const isWhite = receipt.playerWhite === perspectiveWallet;
    return {
      matchId: receipt.matchId,
      betLamports: receipt.betLamports,
      potLamports: receipt.potLamports,
      rakeLamports: receipt.rakeLamports,
      role: isWhite ? "white" : "black",
      opponent: isWhite ? receipt.playerBlack : receipt.playerWhite,
      won: receipt.winner
        ? receipt.winner === perspectiveWallet
        : null,
      createdAt: receipt.createdAt,
      gameMode,
    };
  }

  async getGameModeStats(): Promise<GameModeStatRow[]> {
    const [lobbies, completed] = await Promise.all([
      this.col("match_log")
        .aggregate<{ _id: string; lobbiesCreated: number }>([
          { $match: { event: "lobby_created" } },
          {
            $group: {
              _id: { $ifNull: ["$payload.gameMode", "unknown"] },
              lobbiesCreated: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      this.col("match_log")
        .aggregate<{ _id: string; gamesCompleted: number }>([
          { $match: { event: "game_over" } },
          {
            $lookup: {
              from: "match_log",
              let: { mid: "$matchId" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$matchId", "$$mid"] },
                        { $eq: ["$event", "lobby_created"] },
                      ],
                    },
                  },
                },
                { $limit: 1 },
                {
                  $project: {
                    gameMode: {
                      $ifNull: ["$payload.gameMode", "unknown"],
                    },
                  },
                },
              ],
              as: "lobby",
            },
          },
          {
            $addFields: {
              gameMode: {
                $ifNull: [
                  { $arrayElemAt: ["$lobby.gameMode", 0] },
                  "unknown",
                ],
              },
            },
          },
          {
            $group: {
              _id: "$gameMode",
              gamesCompleted: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const map = new Map<string, GameModeStatRow>();
    for (const row of lobbies) {
      const mode = String(row._id);
      map.set(mode, {
        gameMode: mode,
        lobbiesCreated: row.lobbiesCreated,
        gamesCompleted: 0,
      });
    }
    for (const row of completed) {
      const mode = String(row._id);
      const existing = map.get(mode) ?? {
        gameMode: mode,
        lobbiesCreated: 0,
        gamesCompleted: 0,
      };
      existing.gamesCompleted = row.gamesCompleted;
      map.set(mode, existing);
    }
    return Array.from(map.values()).sort(
      (a, b) => b.gamesCompleted - a.gamesCompleted,
    );
  }

  async getRecentGames(limit: number): Promise<RecentGameRow[]> {
    const receipts = (await this.col("receipts")
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()) as unknown as MatchReceipt[];

    if (receipts.length === 0) return [];

    const matchIds = receipts.map((r) => r.matchId);
    const lobbyEvents = await this.col("match_log")
      .find({ matchId: { $in: matchIds }, event: "lobby_created" })
      .toArray();

    const lobbyModeMap = new Map<string, string>();
    for (const event of lobbyEvents) {
      const payload = event.payload as { gameMode?: string } | null;
      lobbyModeMap.set(
        String(event.matchId),
        payload?.gameMode ? String(payload.gameMode) : "unknown",
      );
    }

    return receipts.map((r) => ({
      matchId: r.matchId,
      playerWhite: r.playerWhite,
      playerBlack: r.playerBlack,
      winner: r.winner,
      betLamports: r.betLamports,
      potLamports: r.potLamports,
      rakeLamports: r.rakeLamports,
      createdAt: r.createdAt,
      gameMode: lobbyModeMap.get(r.matchId),
    }));
  }

  async upsertActiveMatch(snapshot: PersistedActiveMatch): Promise<void> {
    await this.col("active_matches").updateOne(
      { matchId: snapshot.matchId },
      { $set: snapshot as Document },
      { upsert: true },
    );
  }

  async deleteActiveMatch(matchId: string): Promise<void> {
    await this.col("active_matches").deleteOne({ matchId });
  }

  async listActiveMatches(): Promise<PersistedActiveMatch[]> {
    const rows = await this.col("active_matches")
      .find()
      .sort({ updatedAt: -1 })
      .toArray();
    return rows as unknown as PersistedActiveMatch[];
  }

  async consumeRateLimit(
    key: string,
    windowMs: number,
    max: number,
  ): Promise<boolean> {
    const now = Date.now();
    const col = this.col("rate_limits");

    const incremented = await col.findOneAndUpdate(
      { key, resetAt: { $gt: now }, count: { $lt: max } },
      { $inc: { count: 1 } },
      { returnDocument: "after" },
    );
    if (incremented) return true;

    const blocked = await col.findOne({
      key,
      resetAt: { $gt: now },
      count: { $gte: max },
    });
    if (blocked) return false;

    await col.updateOne(
      { key, resetAt: { $lte: now } },
      { $set: { key, count: 1, resetAt: now + windowMs } },
      { upsert: true },
    );

    const afterReset = await col.findOne({ key });
    if (!afterReset) return true;
    if (afterReset.resetAt <= now) return true;
    return afterReset.count <= max;
  }

  async revokePlayerSessions(wallet: string): Promise<void> {
    await this.col("player_sessions").deleteMany({ wallet });
  }

  async createGuestSession(session: GuestSessionRecord): Promise<void> {
    await this.col("guest_sessions").insertOne(session as Document);
  }

  async getGuestSession(token: string): Promise<GuestSessionRecord | null> {
    const now = Date.now();
    const row = await this.col("guest_sessions").findOne({
      token,
      expiresAt: { $gt: now },
    });
    return row ? (row as unknown as GuestSessionRecord) : null;
  }

  async bindGuestSessionSocket(
    token: string,
    socketId: string,
  ): Promise<boolean> {
    const now = Date.now();
    const claimed = await this.col("guest_sessions").findOneAndUpdate(
      { token, expiresAt: { $gt: now } },
      { $set: { socketId } },
      { returnDocument: "after" },
    );
    return Boolean(claimed);
  }

  async releaseGuestSessionSocket(socketId: string): Promise<void> {
    await this.col("guest_sessions").updateMany(
      { socketId },
      { $unset: { socketId: "" } },
    );
  }
}

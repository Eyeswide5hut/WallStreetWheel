import { type InsertUser, type User, type Trade, type InsertTrade, users, trades } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { type UpdateUser, type LeaderboardMetric } from "@shared/schema";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Trade operations
  createTrade(userId: number, trade: InsertTrade): Promise<Trade>;
  getUserTrades(userId: number): Promise<Trade[]>;
  getTrade(id: number): Promise<Trade | undefined>;

  // Leaderboard operations
  getLeaderboard(metric: LeaderboardMetric, order: "asc" | "desc", limit: number): Promise<User[]>;
  getLeaderboardByWinRate(order: "asc" | "desc", limit: number): Promise<User[]>;

  sessionStore: session.Store;
  updateUser(id: number, data: UpdateUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    // Configure session store for Neon
    const pgStoreOptions = {
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
      tableName: 'session'
    };

    this.sessionStore = new PostgresSessionStore(pgStoreOptions);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createTrade(userId: number, insertTrade: InsertTrade): Promise<Trade> {
    const trade = {
      ...insertTrade,
      userId,
      strikePrice: insertTrade.strikePrice?.toString(),
      premium: insertTrade.premium.toString(),
    };
    const [createdTrade] = await db.insert(trades).values(trade).returning();
    return createdTrade;
  }

  async getUserTrades(userId: number): Promise<Trade[]> {
    return db.select().from(trades).where(eq(trades.userId, userId));
  }

  async getTrade(id: number): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, id));
    return trade;
  }

  async updateUser(id: number, data: UpdateUser): Promise<User> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getLeaderboard(metric: LeaderboardMetric, order: "asc" | "desc", limit: number): Promise<User[]> {
    return db
      .select({
        id: users.id,
        username: users.username,
        [metric]: users[metric],
        rank: users.rank,
      })
      .from(users)
      .orderBy(sql`${users[metric]} ${sql.raw(order)}`)
      .limit(limit);
  }

  async getLeaderboardByWinRate(order: "asc" | "desc", limit: number): Promise<User[]> {
    return db
      .select({
        id: users.id,
        username: users.username,
        winRate: sql`CASE 
          WHEN ${users.tradeCount} = 0 THEN 0
          ELSE CAST(${users.winCount} AS FLOAT) / ${users.tradeCount}
        END`,
        rank: users.rank,
      })
      .from(users)
      .orderBy(sql`winRate ${sql.raw(order)}`)
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
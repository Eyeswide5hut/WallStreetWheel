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
  createTrade(userId: number, trade: InsertTrade): Promise<Trade>;
  getUserTrades(userId: number): Promise<Trade[]>;
  getTrade(id: number): Promise<Trade | undefined>;
  getLeaderboard(metric: LeaderboardMetric, order: "asc" | "desc", limit: number): Promise<Partial<User>[]>;
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
    try {
      if (!id || typeof id !== 'number') {
        console.error('Invalid user ID:', id);
        return undefined;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .execute();

      return user;
    } catch (error) {
      console.error('Error retrieving user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      if (!username) {
        console.error('Invalid username:', username);
        return undefined;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .execute();

      return user;
    } catch (error) {
      console.error('Error retrieving user by username:', error);
      return undefined;
    }
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

  async getLeaderboard(metric: LeaderboardMetric, order: "asc" | "desc", limit: number): Promise<Partial<User>[]> {
    const column = users[metric];
    if (!column) {
      throw new Error(`Invalid metric: ${metric}`);
    }

    return db
      .select({
        id: users.id,
        username: users.username,
        totalProfitLoss: users.totalProfitLoss,
        tradeCount: users.tradeCount,
        averageReturn: users.averageReturn,
        winRate: sql`CASE 
          WHEN ${users.tradeCount} = 0 THEN 0
          ELSE CAST(${users.winCount} AS FLOAT) / ${users.tradeCount}
        END`,
      })
      .from(users)
      .orderBy(metric === 'winRate' ? 
        sql`winRate ${sql.raw(order)}` : 
        sql`${column} ${sql.raw(order)}`)
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
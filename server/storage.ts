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
  getTraderProfile(id: number): Promise<User | undefined>;
  closeTrade(tradeId: number, closeData: {
    closePrice: number;
    closeDate: Date;
    wasAssigned: boolean;
  }): Promise<Trade>;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
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
    const winRateExpr = sql`CASE 
      WHEN ${users.tradeCount} = 0 THEN 0
      ELSE CAST(${users.winCount} AS FLOAT) / NULLIF(${users.tradeCount}, 0)
    END`;

    let orderExpr;
    if (metric === 'winRate') {
      orderExpr = sql`${winRateExpr} ${sql.raw(order)}`;
    } else {
      orderExpr = sql`${users[metric]} ${sql.raw(order)}`;
    }

    return db
      .select({
        id: users.id,
        username: users.username,
        totalProfitLoss: users.totalProfitLoss,
        tradeCount: users.tradeCount,
        averageReturn: users.averageReturn,
        winRate: winRateExpr,
      })
      .from(users)
      .orderBy(orderExpr)
      .limit(limit);
  }

  async getTraderProfile(id: number): Promise<User | undefined> {
    try {
      if (!id || typeof id !== 'number') {
        console.error('Invalid trader ID:', id);
        return undefined;
      }

      const [trader] = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          totalProfitLoss: users.totalProfitLoss,
          tradeCount: users.tradeCount,
          winCount: users.winCount,
          averageReturn: users.averageReturn,
          platforms: users.platforms,
          preferences: users.preferences,
          marginEnabled: users.marginEnabled,
          marginRate: users.marginRate,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .where(eq(users.id, id))
        .execute();

      return trader;
    } catch (error) {
      console.error('Error retrieving trader profile:', error);
      return undefined;
    }
  }

  async closeTrade(tradeId: number, closeData: {
    closePrice: number;
    closeDate: Date;
    wasAssigned: boolean;
  }): Promise<Trade> {
    try {
      const [trade] = await db
        .select()
        .from(trades)
        .where(eq(trades.id, tradeId));

      if (!trade) {
        throw new Error("Trade not found");
      }

      if (trade.closeDate) {
        throw new Error("Trade is already closed");
      }

      const initialCost = parseFloat(trade.premium) * trade.quantity;
      const finalValue = closeData.closePrice * trade.quantity;
      const profitLoss = finalValue - initialCost;
      const returnPercentage = (profitLoss / Math.abs(initialCost) * 100).toString();

      const [updatedTrade] = await db
        .update(trades)
        .set({
          closePrice: closeData.closePrice.toString(),
          closeDate: closeData.closeDate,
          wasAssigned: closeData.wasAssigned,
          profitLoss: profitLoss.toString(),
          isWin: profitLoss > 0,
          returnPercentage
        })
        .where(eq(trades.id, tradeId))
        .returning();

      const userTrades = await db.select({
        totalProfitLoss: sql`SUM(CAST(profit_loss AS DECIMAL))`,
        tradeCount: sql`COUNT(*)`,
        winCount: sql`SUM(CASE WHEN is_win THEN 1 ELSE 0 END)`,
      }).from(trades).where(eq(trades.userId, trade.userId)).then(rows => rows[0]);

      await db.update(users)
        .set({
          totalProfitLoss: (userTrades.totalProfitLoss || 0).toString(),
          tradeCount: Number(userTrades.tradeCount) || 0,
          winCount: Number(userTrades.winCount) || 0,
          averageReturn: ((Number(userTrades.totalProfitLoss) || 0) / (Number(userTrades.tradeCount) || 1)).toString()
        })
        .where(eq(users.id, trade.userId));

      return updatedTrade;
    } catch (error) {
      console.error('Error closing trade:', error);
      throw error instanceof Error ? error : new Error("Failed to close trade");
    }
  }
}

export const storage = new DatabaseStorage();
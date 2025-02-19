import { type InsertUser, type User, type Trade, type InsertTrade, users, trades, sharePositions, type SharePosition, type InsertSharePosition } from "@shared/schema";
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
  getSharePositions(userId: number): Promise<SharePosition[]>;
  updateSharePosition(userId: number, symbol: string, quantity: number, cost: number): Promise<SharePosition>;
  createSharePosition(userId: number, position: InsertSharePosition): Promise<SharePosition>;
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
    try {
      const trade = {
        ...insertTrade,
        userId,
        strikePrice: insertTrade.strikePrice?.toString(),
        premium: insertTrade.premium.toString(),
      };

      const [createdTrade] = await db.insert(trades)
        .values(trade)
        .returning();

      return createdTrade;
    } catch (error) {
      console.error('Error creating trade:', error);
      throw new Error('Failed to create trade');
    }
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
          password: users.password,
          totalProfitLoss: users.totalProfitLoss,
          tradeCount: users.tradeCount,
          winCount: users.winCount,
          averageReturn: users.averageReturn,
          platforms: users.platforms,
          preferences: users.preferences,
          rank: users.rank,
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

      // Validate close date is between trade date and expiration
      const closeDate = new Date(closeData.closeDate);
      const tradeDate = new Date(trade.tradeDate);
      const expirationDate = new Date(trade.expirationDate);

      if (closeDate < tradeDate) {
        throw new Error("Close date cannot be before trade open date");
      }

      if (closeDate > expirationDate) {
        throw new Error("Close date cannot be after expiration date");
      }

      let profitLoss: number;
      let sharesAssigned = 0;
      let assignmentPrice = null;
      let affectedSharePositionId = null;

      // Calculate P/L based on option type and assignment status
      const premium = parseFloat(trade.premium.toString());
      const quantity = trade.quantity;
      const strikePrice = parseFloat(trade.strikePrice?.toString() || '0');

      if (closeData.wasAssigned) {
        // Handle assignment cases
        switch (trade.optionType) {
          case "covered_call": {
            // Shares are called away at strike price
            sharesAssigned = -100 * quantity; // Negative because shares are called away
            assignmentPrice = strikePrice;

            // Find existing share position
            const [sharePosition] = await db
              .select()
              .from(sharePositions)
              .where(sql`user_id = ${trade.userId} AND symbol = ${trade.underlyingAsset}`);

            if (!sharePosition || sharePosition.quantity < Math.abs(sharesAssigned)) {
              throw new Error("Insufficient shares for covered call assignment");
            }

            // P/L = (Strike Price - Average Cost) * Shares + Premium
            const avgCost = parseFloat(sharePosition.averageCost.toString());
            profitLoss = ((strikePrice - avgCost) * Math.abs(sharesAssigned)) + (premium * quantity * 100);
            affectedSharePositionId = sharePosition.id;
            break;
          }
          case "cash_secured_put": {
            // Shares are assigned at strike price
            sharesAssigned = 100 * quantity;
            assignmentPrice = strikePrice;
            // P/L = Premium + (Market Price - Strike Price) * Shares
            profitLoss = (premium * quantity * 100) +
              ((closeData.closePrice - strikePrice) * sharesAssigned);
            break;
          }
          case "long_call": {
            // Exercising a long call
            sharesAssigned = 100 * quantity;
            assignmentPrice = strikePrice;
            // P/L = (Market Price - Strike Price) * Shares - Premium
            profitLoss = ((closeData.closePrice - strikePrice) * sharesAssigned) -
              (premium * quantity * 100);
            break;
          }
          case "long_put": {
            // Exercising a long put
            sharesAssigned = -100 * quantity;
            assignmentPrice = strikePrice;
            // P/L = (Strike Price - Market Price) * Shares - Premium
            profitLoss = ((strikePrice - closeData.closePrice) * Math.abs(sharesAssigned)) -
              (premium * quantity * 100);
            break;
          }
          default:
            throw new Error(`Assignment not supported for ${trade.optionType}`);
        }
      } else {
        // Regular close without assignment
        switch (trade.optionType) {
          case "covered_call":
          case "cash_secured_put":
          case "naked_call":
          case "naked_put": {
            // Short options: profit = premium received - cost to close
            profitLoss = (premium * quantity * 100) -
              (closeData.closePrice * quantity * 100);
            break;
          }
          case "long_call":
          case "long_put": {
            // Long options: profit = sale price - premium paid
            profitLoss = (closeData.closePrice * quantity * 100) -
              (premium * quantity * 100);
            break;
          }
          default:
            throw new Error(`Unsupported option type: ${trade.optionType}`);
        }
      }

      // Update the trade
      const [updatedTrade] = await db
        .update(trades)
        .set({
          closePrice: closeData.closePrice.toString(),
          closeDate: closeData.closeDate,
          wasAssigned: closeData.wasAssigned,
          profitLoss: profitLoss.toString(),
          isWin: profitLoss > 0,
          returnPercentage: ((profitLoss / Math.abs(premium * quantity * 100)) * 100).toString(),
          sharesAssigned,
          assignmentPrice: assignmentPrice?.toString(),
          affectedSharePositionId
        })
        .where(eq(trades.id, tradeId))
        .returning();

      // Update share positions if assignment occurred
      if (closeData.wasAssigned && sharesAssigned !== 0) {
        await this.updateSharePosition(
          trade.userId,
          trade.underlyingAsset,
          sharesAssigned,
          assignmentPrice || 0
        );
      }

      // Update user statistics
      await this.updateUserStats(trade.userId);

      return updatedTrade;
    } catch (error) {
      console.error('Error closing trade:', error);
      throw error instanceof Error ? error : new Error("Failed to close trade");
    }
  }

  private async updateUserStats(userId: number) {
    const userTrades = await db.select({
      totalProfitLoss: sql`SUM(CAST(profit_loss AS DECIMAL))`,
      tradeCount: sql`COUNT(*)`,
      winCount: sql`SUM(CASE WHEN is_win THEN 1 ELSE 0 END)`,
    }).from(trades).where(eq(trades.userId, userId)).then(rows => rows[0]);

    await db.update(users)
      .set({
        totalProfitLoss: (userTrades.totalProfitLoss || 0).toString(),
        tradeCount: Number(userTrades.tradeCount) || 0,
        winCount: Number(userTrades.winCount) || 0,
        averageReturn: ((Number(userTrades.totalProfitLoss) || 0) / (Number(userTrades.tradeCount) || 1)).toString()
      })
      .where(eq(users.id, userId));
  }

  async getSharePositions(userId: number): Promise<SharePosition[]> {
    return db
      .select()
      .from(sharePositions)
      .where(eq(sharePositions.userId, userId));
  }

  async updateSharePosition(userId: number, symbol: string, quantityChange: number, price: number): Promise<SharePosition> {
    const [existingPosition] = await db
      .select()
      .from(sharePositions)
      .where(sql`user_id = ${userId} AND symbol = ${symbol}`);

    if (existingPosition) {
      const newQuantity = existingPosition.quantity + quantityChange;
      const oldCost = parseFloat(existingPosition.averageCost.toString()) * existingPosition.quantity;
      const newCost = price * Math.abs(quantityChange);
      const newAverageCost = newQuantity !== 0 ? ((oldCost + newCost) / newQuantity).toString() : '0';

      const [updatedPosition] = await db
        .update(sharePositions)
        .set({
          quantity: newQuantity,
          averageCost: newAverageCost,
          lastUpdated: new Date(),
          acquisitionHistory: sql`jsonb_array_append(acquisition_history, ${JSON.stringify({
            date: new Date(),
            quantity: quantityChange,
            price: price,
            type: quantityChange > 0 ? 'assignment' : 'called_away'
          })})`
        })
        .where(eq(sharePositions.id, existingPosition.id))
        .returning();

      return updatedPosition;
    } else {
      const [newPosition] = await db
        .insert(sharePositions)
        .values({
          userId,
          symbol,
          quantity: quantityChange,
          averageCost: price.toString(),
          acquisitionHistory: JSON.stringify([{
            date: new Date(),
            quantity: quantityChange,
            price: price,
            type: 'assignment'
          }])
        })
        .returning();

      return newPosition;
    }
  }

  async createSharePosition(userId: number, position: InsertSharePosition): Promise<SharePosition> {
    const [newPosition] = await db
      .insert(sharePositions)
      .values({
        ...position,
        userId,
        acquisitionHistory: JSON.stringify([{
          date: new Date(),
          quantity: position.quantity,
          price: parseFloat(position.averageCost.toString()),
          type: 'manual_entry'
        }])
      })
      .returning();

    return newPosition;
  }
}

export const storage = new DatabaseStorage();
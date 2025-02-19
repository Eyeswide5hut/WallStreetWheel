import { type InsertUser, type User, type Trade, type InsertTrade, users, trades, sharePositions, 
  type SharePosition, type InsertSharePosition, type InsertTransaction, type AccountTransaction,
  accountTransactions } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { type UpdateUser } from "@shared/schema";
import { type InsertTradeIdea, tradeIdeas, type TradeIdea, tradeIdeaComments, tradeIdeaReactions } from "@shared/schema";
import { type InsertScannerConfig, scannerConfigs, type ScannerConfig } from "@shared/schema";
import { type LeaderboardMetric } from "@shared/types";
import { userFollows } from "@shared/schema";


const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createTrade(userId: number, trade: InsertTrade): Promise<Trade>;
  getUserTrades(userId: number): Promise<Trade[]>;
  getTrade(id: number): Promise<Trade | undefined>;
  updateUser(id: number, data: UpdateUser): Promise<User>;
  getTraderProfile(id: number): Promise<User | undefined>;
  createTransaction(userId: number, transaction: InsertTransaction): Promise<AccountTransaction>;
  getUserTransactions(userId: number): Promise<AccountTransaction[]>;
  getUserBalance(userId: number): Promise<{
    currentBalance: string;
    totalDeposited: string;
    totalWithdrawn: string;
    totalCapitalUsed: string;
  }>;

  // Social Features
  followUser(followerId: number, followedId: number): Promise<void>;
  unfollowUser(followerId: number, followedId: number): Promise<void>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  createTradeIdea(userId: number, idea: InsertTradeIdea): Promise<TradeIdea>;
  getTradeIdeas(filters?: { userId?: number; visibility?: string }): Promise<TradeIdea[]>;
  addTradeIdeaComment(userId: number, ideaId: number, content: string): Promise<typeof tradeIdeaComments.$inferSelect>;
  addTradeIdeaReaction(userId: number, ideaId: number, reaction: string): Promise<typeof tradeIdeaReactions.$inferSelect>;

  // Market Scanner
  createScannerConfig(userId: number, config: InsertScannerConfig): Promise<ScannerConfig>;
  getScannerConfigs(userId: number): Promise<ScannerConfig[]>;
  getPublicScannerTemplates(): Promise<ScannerConfig[]>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users)
        .values({
          ...insertUser,
          currentBalance: '0',
          totalDeposited: '0',
          totalWithdrawn: '0',
          totalCapitalUsed: '0',
          totalProfitLoss: '0',
          tradeCount: 0,
          winCount: 0,
          averageReturn: '0',
        })
        .returning();

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      if (!id || typeof id !== 'number') {
        console.error('Invalid user ID:', id);
        return undefined;
      }

      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          password: users.password,
          email: users.email,
          platforms: users.platforms,
          preferences: users.preferences,
          totalProfitLoss: users.totalProfitLoss,
          tradeCount: users.tradeCount,
          winCount: users.winCount,
          averageReturn: users.averageReturn,
          currentBalance: users.currentBalance,
          totalDeposited: users.totalDeposited,
          totalWithdrawn: users.totalWithdrawn,
          totalCapitalUsed: users.totalCapitalUsed,
          rank: users.rank,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .where(eq(users.id, id));

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
        .select({
          id: users.id,
          username: users.username,
          password: users.password,
          email: users.email,
          platforms: users.platforms,
          preferences: users.preferences,
          totalProfitLoss: users.totalProfitLoss,
          tradeCount: users.tradeCount,
          winCount: users.winCount,
          averageReturn: users.averageReturn,
          currentBalance: users.currentBalance,
          totalDeposited: users.totalDeposited,
          totalWithdrawn: users.totalWithdrawn,
          totalCapitalUsed: users.totalCapitalUsed,
          rank: users.rank,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .where(eq(users.username, username));

      return user;
    } catch (error) {
      console.error('Error retrieving user by username:', error);
      return undefined;
    }
  }

  async createTransaction(userId: number, transaction: InsertTransaction): Promise<AccountTransaction> {
    try {
      let newTransaction: AccountTransaction;

      await db.transaction(async (tx) => {
        // Create the transaction
        const [txn] = await tx.insert(accountTransactions)
          .values({
            userId,
            type: transaction.type,
            amount: transaction.amount.toString(),
            date: transaction.date,
            notes: transaction.notes
          })
          .returning();

        newTransaction = txn;

        // Get current user balance with null checks
        const [user] = await tx.select({
          currentBalance: users.currentBalance,
          totalDeposited: users.totalDeposited,
          totalWithdrawn: users.totalWithdrawn,
        })
          .from(users)
          .where(eq(users.id, userId));

        if (!user) {
          throw new Error('User not found');
        }

        // Parse values with null checks
        const currentBalance = parseFloat(user.currentBalance?.toString() || '0');
        const totalDeposited = parseFloat(user.totalDeposited?.toString() || '0');
        const totalWithdrawn = parseFloat(user.totalWithdrawn?.toString() || '0');

        const amount = transaction.amount;
        const newBalance = transaction.type === 'deposit'
          ? currentBalance + amount
          : currentBalance - amount;

        // Update user balance
        await tx.update(users)
          .set({
            currentBalance: newBalance.toString(),
            totalDeposited: transaction.type === 'deposit'
              ? (totalDeposited + amount).toString()
              : totalDeposited.toString(),
            totalWithdrawn: transaction.type === 'withdrawal'
              ? (totalWithdrawn + amount).toString()
              : totalWithdrawn.toString(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      });

      return newTransaction!;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Failed to create transaction');
    }
  }

  async getUserTransactions(userId: number): Promise<AccountTransaction[]> {
    return db
      .select()
      .from(accountTransactions)
      .where(eq(accountTransactions.userId, userId))
      .orderBy(sql`${accountTransactions.date} DESC`);
  }

  async getUserBalance(userId: number): Promise<{
    currentBalance: string;
    totalDeposited: string;
    totalWithdrawn: string;
    totalCapitalUsed: string;
  }> {
    const [user] = await db
      .select({
        currentBalance: users.currentBalance,
        totalDeposited: users.totalDeposited,
        totalWithdrawn: users.totalWithdrawn,
        totalCapitalUsed: users.totalCapitalUsed,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return {
        currentBalance: '0',
        totalDeposited: '0',
        totalWithdrawn: '0',
        totalCapitalUsed: '0'
      };
    }

    return {
      currentBalance: user.currentBalance?.toString() || '0',
      totalDeposited: user.totalDeposited?.toString() || '0',
      totalWithdrawn: user.totalWithdrawn?.toString() || '0',
      totalCapitalUsed: user.totalCapitalUsed?.toString() || '0'
    };
  }

  async createTrade(userId: number, insertTrade: InsertTrade): Promise<Trade> {
    try {
      let createdTrade: Trade;

      await db.transaction(async (tx) => {
        const [trade] = await tx.insert(trades)
          .values({
            userId,
            underlyingAsset: insertTrade.underlyingAsset,
            optionType: insertTrade.optionType,
            strikePrice: insertTrade.strikePrice?.toString(),
            premium: insertTrade.premium.toString(),
            quantity: insertTrade.quantity,
            platform: insertTrade.platform,
            useMargin: insertTrade.useMargin,
            notes: insertTrade.notes,
            tags: insertTrade.tags,
            tradeDate: insertTrade.tradeDate,
            expirationDate: insertTrade.expirationDate,
            legs: insertTrade.legs,
            // Calculate capital used based on trade type
            capitalUsed: (Math.abs(insertTrade.premium) * insertTrade.quantity * 100).toString(),
          })
          .returning();

        createdTrade = trade;

        // Update user's total capital used
        const [user] = await tx.select({
          totalCapitalUsed: users.totalCapitalUsed,
        })
          .from(users)
          .where(eq(users.id, userId));

        if (!user) {
          throw new Error('User not found');
        }

        const currentCapitalUsed = parseFloat(user.totalCapitalUsed?.toString() || '0');
        const newCapitalUsed = currentCapitalUsed + parseFloat(trade.capitalUsed);

        await tx.update(users)
          .set({
            totalCapitalUsed: newCapitalUsed.toString(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      });

      return createdTrade!;
    } catch (error) {
      console.error('Error creating trade:', error);
      throw new Error('Failed to create trade');
    }
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
  async getUserTrades(userId: number): Promise<Trade[]> {
    return db.select().from(trades).where(eq(trades.userId, userId));
  }

  // Social Features Implementation
  async followUser(followerId: number, followedId: number): Promise<void> {
    if (followerId === followedId) {
      throw new Error("Users cannot follow themselves");
    }

    await db.insert(userFollows)
      .values({
        followerId,
        followedId
      })
      .onConflictDoNothing();
  }

  async unfollowUser(followerId: number, followedId: number): Promise<void> {
    await db.delete(userFollows)
      .where(sql`follower_id = ${followerId} AND followed_id = ${followedId}`);
  }

  async getFollowers(userId: number): Promise<User[]> {
    const followers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        platforms: users.platforms,
        preferences: users.preferences,
        totalProfitLoss: users.totalProfitLoss,
        tradeCount: users.tradeCount,
        winCount: users.winCount,
        averageReturn: users.averageReturn,
        rank: users.rank,
        createdAt: users.createdAt,
      })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followerId, users.id))
      .where(eq(userFollows.followedId, userId));

    return followers;
  }

  async getFollowing(userId: number): Promise<User[]> {
    const following = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        platforms: users.platforms,
        preferences: users.preferences,
        totalProfitLoss: users.totalProfitLoss,
        tradeCount: users.tradeCount,
        winCount: users.winCount,
        averageReturn: users.averageReturn,
        rank: users.rank,
        createdAt: users.createdAt,
      })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followedId, users.id))
      .where(eq(userFollows.followerId, userId));

    return following;
  }

  async createTradeIdea(userId: number, idea: InsertTradeIdea): Promise<TradeIdea> {
    const [newIdea] = await db.insert(tradeIdeas)
      .values({
        userId,
        ...idea,
      })
      .returning();

    return newIdea;
  }

  async getTradeIdeas(filters?: { userId?: number; visibility?: string }): Promise<TradeIdea[]> {
    let query = db.select().from(tradeIdeas);

    if (filters?.userId) {
      query = query.where(eq(tradeIdeas.userId, filters.userId));
    }

    if (filters?.visibility) {
      query = query.where(eq(tradeIdeas.visibility, filters.visibility));
    }

    return query.orderBy(sql`${tradeIdeas.createdAt} DESC`);
  }

  async addTradeIdeaComment(userId: number, ideaId: number, content: string) {
    const [comment] = await db.insert(tradeIdeaComments)
      .values({
        userId,
        tradeIdeaId: ideaId,
        content
      })
      .returning();

    return comment;
  }

  async addTradeIdeaReaction(userId: number, ideaId: number, reaction: string) {
    const [newReaction] = await db.insert(tradeIdeaReactions)
      .values({
        userId,
        tradeIdeaId: ideaId,
        reaction
      })
      .returning();

    return newReaction;
  }

  // Market Scanner Implementation
  async createScannerConfig(userId: number, config: InsertScannerConfig): Promise<ScannerConfig> {
    const [newConfig] = await db.insert(scannerConfigs)
      .values({
        userId,
        ...config,
      })
      .returning();

    return newConfig;
  }

  async getScannerConfigs(userId: number): Promise<ScannerConfig[]> {
    return db.select()
      .from(scannerConfigs)
      .where(eq(scannerConfigs.userId, userId))
      .orderBy(sql`${scannerConfigs.updatedAt} DESC`);
  }

  async getPublicScannerTemplates(): Promise<ScannerConfig[]> {
    return db.select()
      .from(scannerConfigs)
      .where(sql`is_template = true AND is_public = true`)
      .orderBy(sql`${scannerConfigs.updatedAt} DESC`);
  }
}

export const storage = new DatabaseStorage();
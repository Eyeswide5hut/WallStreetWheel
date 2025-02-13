import { type InsertUser, type User, type Trade, type InsertTrade, type UpdateUser, users, trades } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import MemoryStore from "memorystore";

const MemoryStoreSession = MemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Trade operations
  createTrade(userId: number, trade: InsertTrade): Promise<Trade>;
  getUserTrades(userId: number): Promise<Trade[]>;
  getTrade(id: number): Promise<Trade | undefined>;

  sessionStore: session.Store;
  updateUser(id: number, data: UpdateUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    // Use memory store instead of PostgreSQL for sessions
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
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
      strikePrice: insertTrade.strikePrice?.toString(), // Handle optional strikePrice
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
}

export const storage = new DatabaseStorage();
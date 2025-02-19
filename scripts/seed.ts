import { db } from "../server/db";
import { users, trades, sharePositions } from "@shared/schema";
import { sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  // Clear existing data
  await db.delete(trades);
  await db.delete(sharePositions);
  await db.delete(users);

  // Create demo trader
  const demoUser = await db.insert(users).values({
    username: "trading_pro",
    email: "demo@trading.com",
    password: await hashPassword("demo2025"),
    marginEnabled: true,
    marginRate: "6.5",
    platforms: JSON.stringify([
      {
        id: "robinhood",
        name: "Robinhood",
        enabled: true,
        feeStructure: { perContract: 0.65, base: 0 }
      },
      {
        id: "td_ameritrade",
        name: "TD Ameritrade",
        enabled: true,
        feeStructure: { perContract: 0.65, base: 0 }
      }
    ]),
    preferences: JSON.stringify({
      theme: "system",
      notifications: { email: true, web: true }
    })
  }).returning();

  // Add share positions
  const sharePositionsData = [
    {
      userId: demoUser[0].id,
      symbol: "AAPL",
      quantity: 100,
      averageCost: "185.50",
      acquisitionHistory: JSON.stringify([
        {
          date: new Date("2025-01-15"),
          quantity: 100,
          price: 185.50,
          type: "manual_entry"
        }
      ])
    },
    {
      userId: demoUser[0].id,
      symbol: "SPY",
      quantity: 50,
      averageCost: "495.75",
      acquisitionHistory: JSON.stringify([
        {
          date: new Date("2025-01-20"),
          quantity: 50,
          price: 495.75,
          type: "manual_entry"
        }
      ])
    },
    {
      userId: demoUser[0].id,
      symbol: "MSFT",
      quantity: 75,
      averageCost: "420.25",
      acquisitionHistory: JSON.stringify([
        {
          date: new Date("2025-02-01"),
          quantity: 75,
          price: 420.25,
          type: "manual_entry"
        }
      ])
    }
  ];

  await db.insert(sharePositions).values(sharePositionsData);

  // Add example trades
  const tradesData = [
    {
      userId: demoUser[0].id,
      tradeType: "option",
      underlyingAsset: "AAPL",
      optionType: "covered_call",
      strikePrice: "190.00",
      premium: "3.50",
      quantity: 1,
      platform: "robinhood",
      useMargin: false,
      notes: "Monthly covered call strategy on AAPL position",
      tags: ["monthly-income", "covered-call"],
      tradeDate: new Date("2025-02-01"),
      expirationDate: new Date("2025-02-21"),
      profitLoss: "350",
      isWin: true,
      returnPercentage: "18.42",
      capitalUsed: "19000"
    },
    {
      userId: demoUser[0].id,
      tradeType: "option",
      underlyingAsset: "SPY",
      optionType: "cash_secured_put",
      strikePrice: "490.00",
      premium: "4.25",
      quantity: 1,
      platform: "td_ameritrade",
      useMargin: false,
      notes: "Cash secured put on market pullback",
      tags: ["pullback", "csp"],
      tradeDate: new Date("2025-02-05"),
      expirationDate: new Date("2025-02-28"),
      profitLoss: null,
      isWin: null,
      returnPercentage: null,
      capitalUsed: "49000"
    },
    {
      userId: demoUser[0].id,
      tradeType: "stock",
      underlyingAsset: "MSFT",
      quantity: 75,
      entryPrice: "420.25",
      platform: "robinhood",
      useMargin: false,
      notes: "Long-term hold on MSFT growth",
      tags: ["growth", "tech"],
      tradeDate: new Date("2025-02-01"),
      capitalUsed: "31518.75"
    }
  ];

  await db.insert(trades).values(tradesData);

  // Update user stats
  const userTrades = await db.select({
    totalProfitLoss: sql`SUM(CAST(profit_loss AS DECIMAL))`,
    tradeCount: sql`COUNT(*)`,
    winCount: sql`SUM(CASE WHEN is_win THEN 1 ELSE 0 END)`,
  }).from(trades).where(sql`user_id = ${demoUser[0].id}`).then(rows => rows[0]);

  await db.update(users)
    .set({
      totalProfitLoss: userTrades.totalProfitLoss?.toString() || "0",
      tradeCount: Number(userTrades.tradeCount) || 0,
      winCount: Number(userTrades.winCount) || 0,
      averageReturn: (Number(userTrades.totalProfitLoss || 0) / Number(userTrades.tradeCount || 1)).toString()
    })
    .where(sql`id = ${demoUser[0].id}`);

  console.log("Database seeded successfully with new demo data!");
}

seed().catch(console.error);
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

  // Create demo user
  const demoUser = await db.insert(users).values({
    username: "demo_trader",
    email: "demo@example.com",
    password: await hashPassword("password123"),
    marginEnabled: true,
    marginRate: "6.5",
    platforms: JSON.stringify([
      {
        id: "robinhood",
        name: "Robinhood",
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
      quantity: 200,
      averageCost: "175.50",
      acquisitionHistory: JSON.stringify([
        {
          date: new Date("2024-01-15"),
          quantity: 200,
          price: 175.50,
          type: "manual_entry"
        }
      ])
    },
    {
      userId: demoUser[0].id,
      symbol: "SPY",
      quantity: 100,
      averageCost: "485.75",
      acquisitionHistory: JSON.stringify([
        {
          date: new Date("2024-01-20"),
          quantity: 100,
          price: 485.75,
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
      underlyingAsset: "AAPL",
      optionType: "covered_call",
      strikePrice: "180.00",
      premium: "2.50",
      quantity: 2,
      platform: "robinhood",
      useMargin: false,
      notes: "Monthly covered call on AAPL position",
      tags: ["monthly-income", "covered-call"],
      tradeDate: new Date("2024-02-01"),
      expirationDate: new Date("2024-02-16"),
      closeDate: new Date("2024-02-16"),
      closePrice: "0.00",
      wasAssigned: true,
      sharesAssigned: -200,
      assignmentPrice: "180.00",
      profitLoss: "900",
      isWin: true,
      returnPercentage: "18"
    },
    {
      userId: demoUser[0].id,
      underlyingAsset: "SPY",
      optionType: "cash_secured_put",
      strikePrice: "480.00",
      premium: "3.75",
      quantity: 1,
      platform: "robinhood",
      useMargin: false,
      notes: "Cash secured put on market dip",
      tags: ["pullback", "csp"],
      tradeDate: new Date("2024-02-05"),
      expirationDate: new Date("2024-02-23"),
      profitLoss: null,
      isWin: null,
      returnPercentage: null
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

  console.log("Database seeded successfully with demo data!");
}

seed().catch(console.error);
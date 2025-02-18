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

  // Create sample traders
  const traders = [
    { username: "demo_trader", password: "password123", email: "demo@example.com" },
    { username: "options_master", password: "testpass1", email: "options@example.com" },
    { username: "swing_trader", password: "testpass2", email: "swing@example.com" },
    { username: "day_trader", password: "testpass3", email: "day@example.com" },
    { username: "value_investor", password: "testpass4", email: "value@example.com" },
    { username: "momentum_trader", password: "testpass5", email: "momentum@example.com" },
    { username: "tech_trader", password: "testpass6", email: "tech@example.com" },
    { username: "dividend_hunter", password: "testpass7", email: "dividend@example.com" },
    { username: "growth_seeker", password: "testpass8", email: "growth@example.com" },
    { username: "market_maker", password: "testpass9", email: "market@example.com" }
  ];

  const createdUsers = [];
  
  for (const trader of traders) {
    const user = await db.insert(users).values({
      username: trader.username,
      email: trader.email,
      password: await hashPassword(trader.password),
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
    createdUsers.push(user[0]);
  }

  // Create varied share positions and trades for each user
  for (const user of createdUsers) {
    const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "AMD", "SPY"];
    const randomSymbols = symbols.sort(() => Math.random() - 0.5).slice(0, 3);
    
    for (const symbol of randomSymbols) {
      const quantity = Math.floor(Math.random() * 200) + 50;
      const avgCost = (Math.random() * 200 + 100).toFixed(2);
      
      await db.insert(sharePositions).values({
        userId: user.id,
        symbol,
        quantity,
        averageCost: avgCost,
        acquisitionHistory: JSON.stringify([
          {
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            quantity,
            price: parseFloat(avgCost),
            type: "manual_entry"
          }
        ])
      });

      // Add 2-3 trades per position
      const numTrades = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < numTrades; i++) {
        const premium = (Math.random() * 5 + 1).toFixed(2);
        const profitLoss = (Math.random() * 2000 - 1000).toFixed(2);
        
        await db.insert(trades).values({
          userId: user.id,
          underlyingAsset: symbol,
          optionType: Math.random() > 0.5 ? "covered_call" : "cash_secured_put",
          strikePrice: (parseFloat(avgCost) * (Math.random() * 0.2 + 0.9)).toFixed(2),
          premium,
          quantity: Math.floor(Math.random() * 3) + 1,
          platform: "robinhood",
          useMargin: false,
          notes: `${symbol} trade ${i + 1}`,
          tags: ["sample-data"],
          tradeDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          expirationDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
          profitLoss,
          isWin: parseFloat(profitLoss) > 0,
          returnPercentage: (parseFloat(profitLoss) / (parseFloat(premium) * 100) * 100).toFixed(2)
        });
      }
    }
  }
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
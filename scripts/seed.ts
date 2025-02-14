import { db } from "../server/db";
import { users, trades } from "@shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  // Clear existing data
  await db.delete(trades);
  await db.delete(users);

  // Create 20 test users with varied profiles
  const testUsers = Array.from({ length: 20 }, (_, i) => ({
    username: `trader${i + 1}`,
    email: `trader${i + 1}@example.com`,
    password: "password123", // In a real app, this would be hashed
    marginEnabled: Math.random() > 0.5,
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
  }));

  const createdUsers = await db.insert(users).values(testUsers).returning();

  // Generate varied trades for each user
  for (const user of createdUsers) {
    const numTrades = Math.floor(Math.random() * 40) + 10; // 10-50 trades per user
    const tradeDate = new Date();
    
    for (let i = 0; i < numTrades; i++) {
      const isWin = Math.random() > 0.4; // 60% win rate on average
      const premium = (Math.random() * 500 + 100).toFixed(2);
      const profitLoss = isWin 
        ? (parseFloat(premium) * (Math.random() * 0.5 + 0.1)).toFixed(2)
        : (-parseFloat(premium) * (Math.random() * 0.3 + 0.1)).toFixed(2);
      
      tradeDate.setDate(tradeDate.getDate() - Math.floor(Math.random() * 30));
      const expirationDate = new Date(tradeDate);
      expirationDate.setDate(tradeDate.getDate() + 30);

      await db.insert(trades).values({
        userId: user.id,
        underlyingAsset: ["AAPL", "GOOGL", "MSFT", "AMZN", "META"][Math.floor(Math.random() * 5)],
        optionType: ["long_call", "long_put", "covered_call", "cash_secured_put"][Math.floor(Math.random() * 4)],
        strikePrice: (Math.random() * 200 + 100).toString(),
        premium: premium,
        quantity: Math.floor(Math.random() * 5) + 1,
        platform: "robinhood",
        useMargin: false,
        notes: `Test trade ${i + 1}`,
        tags: ["test", isWin ? "winner" : "loser"],
        tradeDate: tradeDate,
        expirationDate: expirationDate,
        profitLoss: profitLoss,
        isWin: isWin,
        returnPercentage: ((parseFloat(profitLoss) / parseFloat(premium)) * 100).toString()
      });
    }

    // Update user stats
    const userTrades = await db.select({
      totalProfitLoss: sql`SUM(profit_loss)`,
      tradeCount: sql`COUNT(*)`,
      winCount: sql`SUM(CASE WHEN is_win THEN 1 ELSE 0 END)`,
    }).from(trades).where(sql`user_id = ${user.id}`).then(rows => rows[0]);

    await db.update(users)
      .set({
        totalProfitLoss: userTrades.totalProfitLoss?.toString() || "0",
        tradeCount: Number(userTrades.tradeCount) || 0,
        winCount: Number(userTrades.winCount) || 0,
        averageReturn: (Number(userTrades.totalProfitLoss || 0) / Number(userTrades.tradeCount || 1)).toString()
      })
      .where(sql`id = ${user.id}`);
  }

  console.log("Database seeded successfully!");
}

seed().catch(console.error);

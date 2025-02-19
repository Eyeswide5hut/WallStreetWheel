import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTradeSchema, updateUserSchema, leaderboardMetricSchema, insertSharePositionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";
import { z } from "zod";

const closeTradeSchema = z.object({
  closePrice: z.number(),
  closeDate: z.string().transform(str => new Date(str)),
  wasAssigned: z.boolean()
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // User profile routes
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const validatedData = updateUserSchema.parse(req.body);
      const updatedUser = await storage.updateUser(req.user!.id, validatedData);
      res.json(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        res.status(400).json({ error: "Invalid profile data" });
      }
    }
  });

  // Trade routes
  app.post("/api/trades", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const validatedTrade = insertTradeSchema.parse(req.body);
      const trade = await storage.createTrade(req.user!.id, validatedTrade);
      res.status(201).json(trade);
    } catch (error) {
      console.error('Trade validation error:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        res.status(400).json({ error: "Invalid trade data" });
      }
    }
  });

  app.get("/api/trades", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const trades = await storage.getUserTrades(req.user!.id);
    res.json(trades);
  });

  app.patch("/api/trades/:id/close", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const tradeId = parseInt(req.params.id);
      if (isNaN(tradeId)) {
        return res.status(400).json({ error: "Invalid trade ID" });
      }

      const validatedData = closeTradeSchema.parse(req.body);
      const trade = await storage.getTrade(tradeId);

      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }

      if (trade.userId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to close this trade" });
      }

      const updatedTrade = await storage.closeTrade(tradeId, validatedData);
      res.json(updatedTrade);
    } catch (error) {
      console.error('Trade close error:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to close trade" });
      }
    }
  });


  // Leaderboard routes
  app.get("/api/leaderboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const query = leaderboardMetricSchema.parse({
        metric: req.query.metric,
        order: req.query.order || 'desc',
        limit: parseInt(req.query.limit as string) || 10
      });

      const leaders = await storage.getLeaderboard(
        query.metric,
        query.order,
        query.limit
      );

      // Format the response to match frontend expectations
      const formattedLeaders = leaders.map(user => ({
        id: user.id,
        username: user.username,
        value: query.metric === 'winRate' ?
          user.winRate :
          query.metric === 'totalProfitLoss' ?
            user.totalProfitLoss :
            user[query.metric]
      }));

      res.json(formattedLeaders);
    } catch (error) {
      console.error('Leaderboard error:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        res.status(400).json({ error: "Invalid leaderboard query" });
      }
    }
  });

  app.get("/api/traders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const traderId = parseInt(req.params.id);
      if (isNaN(traderId)) {
        return res.status(400).json({ error: "Invalid trader ID" });
      }

      // First check if trader exists
      const trader = await storage.getTraderProfile(traderId);
      if (!trader) {
        return res.status(404).json({ error: "Trader not found" });
      }

      // Also fetch their trades
      const trades = await storage.getUserTrades(traderId);

      // Calculate derived metrics
      const winRate = trader.tradeCount ? (trader.winCount || 0) / trader.tradeCount : 0;

      // Return trader with calculated metrics, excluding sensitive data
      res.json({
        id: trader.id,
        username: trader.username,
        totalProfitLoss: trader.totalProfitLoss,
        tradeCount: trader.tradeCount,
        winCount: trader.winCount,
        averageReturn: trader.averageReturn,
        platforms: trader.platforms,
        preferences: trader.preferences,
        rank: trader.rank,
        winRate,
        trades // Include trades in the response
      });
    } catch (error) {
      console.error('Trader profile error:', error);
      res.status(500).json({ error: "Failed to fetch trader profile" });
    }
  });

  // Share Position routes
  app.post("/api/share-positions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const validatedPosition = insertSharePositionSchema.parse(req.body);
      const position = await storage.createSharePosition(req.user!.id, validatedPosition);
      res.status(201).json(position);
    } catch (error) {
      console.error('Share position creation error:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        res.status(400).json({ error: "Invalid share position data" });
      }
    }
  });

  app.get("/api/share-positions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const positions = await storage.getSharePositions(req.user!.id);
      res.json(positions);
    } catch (error) {
      console.error('Error fetching share positions:', error);
      res.status(500).json({ error: "Failed to fetch share positions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
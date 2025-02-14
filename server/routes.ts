import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTradeSchema, updateUserSchema, leaderboardMetricSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";

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

  // Leaderboard routes
  app.get("/api/leaderboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const query = leaderboardMetricSchema.parse(req.query);
      const leaders = await storage.getLeaderboard(
        query.metric,
        query.order,
        query.limit
      );

      // Format the response based on the metric
      res.json(leaders.map((user) => ({
        id: user.id,
        username: user.username,
        value: query.metric === 'winRate' ? user.winRate : user[query.metric],
      })));
    } catch (error) {
      console.error('Leaderboard error:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        res.status(400).json({ error: "Invalid leaderboard query" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
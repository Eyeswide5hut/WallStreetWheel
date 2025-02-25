import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTradeSchema, updateUserSchema, leaderboardMetricSchema, insertSharePositionSchema, insertTradeIdeaSchema, insertScannerConfigSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";
import { z } from "zod";
import { fetchOptionsData } from "./utils/market-data";

const closeTradeSchema = z.object({
  closePrice: z.number(),
  closeDate: z.string().transform(str => new Date(str)),
  wasAssigned: z.boolean()
});

export function registerRoutes(app: Express): Server {
  // Market data endpoint
  app.get('/api/market-data/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      // Implement your market data provider integration here
      const price = await fetchMarketPrice(symbol);
      res.json({ price });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch market data' });
    }
  });

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

    try {
      const trades = await storage.getUserTrades(req.user!.id);
      if (!trades) {
        return res.status(404).json({ error: "No trades found" });
      }
      res.json(trades);
    } catch (error) {
      console.error('Error fetching trades:', error);
      res.status(500).json({ error: "Database connection error - please try again" });
    }
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

      // Update share position if trade was assigned/exercised
      if (validatedData.wasAssigned && trade.optionType) {
        const quantityChange = trade.optionType.includes('call') ? -trade.quantity * 100 : trade.quantity * 100;
        await storage.updateSharePosition(
          trade.userId,
          trade.underlyingAsset,
          quantityChange,
          Number(trade.strikePrice)
        );
      }

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

      const trader = await storage.getUser(traderId);
      const trades = await storage.getUserTrades(traderId);
      if (!trader) {
        return res.status(404).json({ error: "Trader not found" });
      }

      // Calculate derived metrics
      const winRate = trader.tradeCount ? (trader.winCount || 0) / trader.tradeCount : 0;

      // Return trader with calculated metrics and trades
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
        trades
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

  // Add these new routes after the existing ones
  // Social Features Routes
  app.post("/api/users/:id/follow", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const followedId = parseInt(req.params.id);
      if (isNaN(followedId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      await storage.followUser(req.user!.id, followedId);
      res.sendStatus(200);
    } catch (error) {
      console.error('Follow user error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to follow user" });
    }
  });

  app.delete("/api/users/:id/follow", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const followedId = parseInt(req.params.id);
      if (isNaN(followedId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      await storage.unfollowUser(req.user!.id, followedId);
      res.sendStatus(200);
    } catch (error) {
      console.error('Unfollow user error:', error);
      res.status(400).json({ error: "Failed to unfollow user" });
    }
  });

  app.get("/api/users/:id/followers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const followers = await storage.getFollowers(userId);
      res.json(followers);
    } catch (error) {
      console.error('Get followers error:', error);
      res.status(500).json({ error: "Failed to get followers" });
    }
  });

  app.get("/api/users/:id/following", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const following = await storage.getFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error('Get following error:', error);
      res.status(500).json({ error: "Failed to get following" });
    }
  });

  // Trade Ideas Routes
  app.post("/api/trade-ideas", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const validatedIdea = insertTradeIdeaSchema.parse(req.body);
      const idea = await storage.createTradeIdea(req.user!.id, validatedIdea);
      res.status(201).json(idea);
    } catch (error) {
      console.error('Create trade idea error:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        res.status(400).json({ error: "Invalid trade idea data" });
      }
    }
  });

  app.get("/api/trade-ideas", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { userId, visibility } = req.query;
      const filters = {
        userId: userId ? parseInt(userId as string) : undefined,
        visibility: visibility as string | undefined
      };

      const ideas = await storage.getTradeIdeas(filters);
      res.json(ideas);
    } catch (error) {
      console.error('Get trade ideas error:', error);
      res.status(500).json({ error: "Failed to get trade ideas" });
    }
  });

  app.post("/api/trade-ideas/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const ideaId = parseInt(req.params.id);
      if (isNaN(ideaId)) {
        return res.status(400).json({ error: "Invalid trade idea ID" });
      }

      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: "Comment content is required" });
      }

      const comment = await storage.addTradeIdeaComment(req.user!.id, ideaId, content);
      res.status(201).json(comment);
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(400).json({ error: "Failed to add comment" });
    }
  });

  // Market Scanner Routes
  app.post("/api/scanner/configs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const validatedConfig = insertScannerConfigSchema.parse(req.body);
      const config = await storage.createScannerConfig(req.user!.id, validatedConfig);
      res.status(201).json(config);
    } catch (error) {
      console.error('Create scanner config error:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        res.status(400).json({ error: "Invalid scanner configuration" });
      }
    }
  });

  app.get("/api/scanner/configs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const configs = await storage.getScannerConfigs(req.user!.id);
      res.json(configs);
    } catch (error) {
      console.error('Get scanner configs error:', error);
      res.status(500).json({ error: "Failed to get scanner configurations" });
    }
  });

  app.get("/api/scanner/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const templates = await storage.getPublicScannerTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Get scanner templates error:', error);
      res.status(500).json({ error: "Failed to get scanner templates" });
    }
  });

  app.get("/api/trades/latest", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const trades = await storage.getAllTradesWithUserInfo();
      const sortedTrades = trades.sort((a, b) =>
        new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime()
      );
      res.json(sortedTrades.slice(0, 50)); // Return last 50 trades
    } catch (error) {
      console.error('Get latest trades error:', error);
      res.status(500).json({ error: "Failed to get latest trades" });
    }
  });

  app.post("/api/trades/import", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const trades = await processImportedTrades(req.body);
      for (const trade of trades) {
        await storage.createTrade(req.user!.id, trade);
      }
      res.status(201).json({ message: "Trades imported successfully" });
    } catch (error) {
      console.error('Trade import error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to import trades" });
    }
  });

  async function processImportedTrades(data: any[]): Promise<InsertTrade[]> {
    const trades: InsertTrade[] = [];

    for (const row of data) {
      // Skip non-trade rows
      if (!row.Type || !row.Symbol || !row['Trade Date']) continue;

      const tradeDate = new Date(row['Trade Date']);
      const quantity = Math.abs(parseInt(row.Quantity));
      const premium = Math.abs(parseFloat(row.Premium));

      // Parse option details if it's an options trade
      const optionMatch = row.Symbol.match(/([A-Z]+)(\d{6}[CP])(\d+)/);

      if (optionMatch) {
        // It's an options trade
        const [_, underlying, dateStrike, strikePrice] = optionMatch;
        const optionType = dateStrike.endsWith('C') ? 'long_call' : 'long_put';
        const expirationDate = new Date(
          `20${dateStrike.slice(0, 2)}-${dateStrike.slice(2, 4)}-${dateStrike.slice(4, 6)}`
        );

        trades.push({
          tradeType: 'option',
          underlyingAsset: underlying,
          optionType,
          strikePrice: parseFloat(strikePrice) / 1000, // Convert strike price to decimal
          premium,
          quantity,
          platform: 'tastytrade',
          tradeDate,
          expirationDate,
          useMargin: false,
          status: 'open',
          notes: `Imported from TastyTrade - ${row.Type}`,
          tags: ['imported'],
        });
      } else {
        // It's a stock trade
        trades.push({
          tradeType: 'stock',
          underlyingAsset: row.Symbol,
          quantity,
          entryPrice: parseFloat(row.Price),
          platform: 'tastytrade',
          tradeDate,
          useMargin: false,
          status: 'open',
          notes: `Imported from TastyTrade - ${row.Type}`,
          tags: ['imported'],
        });
      }
    }

    return trades;
  }

  // Add after existing route handlers
  app.get("/api/options-scanner", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const querySchema = z.object({
        symbols: z.string(),
        minDelta: z.string().optional(),
        maxDelta: z.string().optional(),
        minDaysToExpiry: z.string().optional(),
        maxDaysToExpiry: z.string().optional(),
        strategy: z.enum(['all', 'calls', 'puts']).optional()
      });

      const { symbols, minDelta, maxDelta, minDaysToExpiry, maxDaysToExpiry, strategy } =
        querySchema.parse(req.query);

      const symbolList = symbols.split(",").filter(Boolean);
      if (symbolList.length === 0) {
        return res.json([]);
      }

      let optionsData = [];
      for (const symbol of symbolList) {
        const data = await fetchOptionsData(symbol);
        optionsData.push(...data);
      }

      // Apply filters
      const now = new Date();
      optionsData = optionsData.filter(option => {
        const daysToExpiry = Math.ceil((new Date(option.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const delta = Math.abs(parseFloat(option.greeks.delta.toString()));

        return (
          (!minDelta || delta >= parseFloat(minDelta)) &&
          (!maxDelta || delta <= parseFloat(maxDelta)) &&
          (!minDaysToExpiry || daysToExpiry >= parseInt(minDaysToExpiry)) &&
          (!maxDaysToExpiry || daysToExpiry <= parseInt(maxDaysToExpiry)) &&
          (!strategy || strategy === 'all' ||
            (strategy === 'calls' && delta > 0) ||
            (strategy === 'puts' && delta < 0))
        );
      });

      res.json(optionsData);
    } catch (error) {
      console.error('Options scanner error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch options data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

interface InsertTrade {
  tradeType: 'stock' | 'option';
  underlyingAsset: string;
  quantity: number;
  entryPrice?: number;
  optionType?: 'long_call' | 'long_put';
  strikePrice?: number;
  premium?: number;
  platform: string;
  tradeDate: Date;
  expirationDate?: Date;
  useMargin: boolean;
  status: 'open' | 'closed';
  notes?: string;
  tags?: string[];
}

async function fetchMarketPrice(symbol: string): Promise<number> {
  // Replace with your actual market data fetching logic
  return 0;
}
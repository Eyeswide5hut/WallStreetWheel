import { pgTable, text, serial, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Add support for various investment types
export const investmentTypes = [
  "stock",
  "etf",
  "mutual_fund",
  "bond",
  "cryptocurrency",
] as const;

// Define option types
export const debitOptionTypes = [
  "long_call",
  "long_put",
] as const;

export const creditOptionTypes = [
  "covered_call",
  "cash_secured_put",
  "naked_call",
  "naked_put",
] as const;

export const spreadOptionTypes = [
  "call_spread",
  "put_spread",
  "iron_condor",
  "butterfly",
] as const;

export const optionTypes = [
  ...debitOptionTypes,
  ...creditOptionTypes,
  ...spreadOptionTypes,
] as const;

// Combine all trade types
export const tradeTypes = [
  ...investmentTypes,
  "option",
] as const;

// Transaction types for tracking cash flows
export const transactionTypes = [
  "deposit",
  "withdrawal",
  "dividend",
  "interest",
  "fee",
] as const;

// Platform definitions
export const tradingPlatforms = [
  "robinhood",
  "td_ameritrade",
  "e_trade",
  "fidelity",
  "charles_schwab",
  "interactive_brokers",
  "webull",
  "tastyworks",
  "think_or_swim",
] as const;

// Schema definitions
export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tradeType: text("trade_type").notNull(),
  underlyingAsset: text("underlying_asset").notNull(),
  optionType: text("option_type"),
  strategy: text("strategy"),  // For tracking specific strategies like "vertical call"
  strikePrice: decimal("strike_price"),
  premium: decimal("premium"),
  quantity: integer("quantity").notNull(),
  entryPrice: decimal("entry_price"),
  exitPrice: decimal("exit_price"),
  platform: text("platform"),
  useMargin: boolean("use_margin").default(false),
  notes: text("notes"),
  tags: text("tags").array(),
  tradeDate: timestamp("trade_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  status: text("status").notNull().default('open'), // 'open' or 'closed'
  daysOpen: integer("days_open"),  // Calculated field
  profitLoss: decimal("profit_loss"),
  profitLossPercent: decimal("profit_loss_percent"), // P/L as percentage
  isWin: boolean("is_win"),
  returnPercentage: decimal("return_percentage"),
  closeDate: timestamp("close_date"),
  closePrice: decimal("close_price"),
  commission: decimal("commission").default('0'),  // Trading commission
  fees: decimal("fees").default('0'),
  wasAssigned: boolean("was_assigned").default(false),
  sharesAssigned: integer("shares_assigned"),
  assignmentPrice: decimal("assignment_price"),
  affectedSharePositionId: integer("affected_share_position_id"),
  capitalUsed: decimal("capital_used").notNull().default('0'),
  marginUsed: decimal("margin_used").default('0'),
  metadata: jsonb("metadata").default('{}'),
});

export const accountTransactions = pgTable("account_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  amount: decimal("amount").notNull(),
  date: timestamp("date").defaultNow(),
  notes: text("notes"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  platforms: jsonb("platforms").default('[]'),
  preferences: jsonb("preferences").default('{}'),
  totalProfitLoss: decimal("total_profit_loss").default('0'),
  tradeCount: integer("trade_count").default(0),
  winCount: integer("win_count").default(0),
  averageReturn: decimal("average_return").default('0'),
  currentBalance: decimal("current_balance").default('0'),
  totalDeposited: decimal("total_deposited").default('0'),
  totalWithdrawn: decimal("total_withdrawn").default('0'),
  totalCapitalUsed: decimal("total_capital_used").default('0'),
  rank: integer("rank"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sharePositions = pgTable("share_positions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  symbol: text("symbol").notNull(),
  quantity: integer("quantity").notNull(),
  averageCost: decimal("average_cost").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  acquisitionHistory: jsonb("acquisition_history").default('[]'),
});

// Social Features - Tables and Types
export const userFollows = pgTable("user_follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id),
  followedId: integer("followed_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tradeIdeas = pgTable("trade_ideas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  symbol: text("symbol").notNull(),
  strategy: text("strategy"),
  optionType: text("option_type"),
  strikePrice: decimal("strike_price"),
  expirationDate: timestamp("expiration_date"),
  targetPrice: decimal("target_price"),
  stopLoss: decimal("stop_loss"),
  riskReward: decimal("risk_reward"),
  confidence: integer("confidence"),
  timeframe: text("timeframe"),
  tags: text("tags").array(),
  visibility: text("visibility").default("public"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tradeIdeaComments = pgTable("trade_idea_comments", {
  id: serial("id").primaryKey(),
  tradeIdeaId: integer("trade_idea_id").notNull().references(() => tradeIdeas.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tradeIdeaReactions = pgTable("trade_idea_reactions", {
  id: serial("id").primaryKey(),
  tradeIdeaId: integer("trade_idea_id").notNull().references(() => tradeIdeas.id),
  userId: integer("user_id").notNull().references(() => users.id),
  reaction: text("reaction").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Market Scanner - Tables and Types
export const scannerConfigs = pgTable("scanner_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  criteria: jsonb("criteria").notNull(),
  isTemplate: boolean("is_template").default(false),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add visibility types
export const visibilityTypes = ["public", "private", "followers"] as const;

// Zod schemas for validation
const optionLegSchema = z.object({
  optionType: z.enum([...debitOptionTypes, ...creditOptionTypes] as const),
  strikePrice: z.number(),
  premium: z.number().positive(),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().int().positive()
});

export const insertTradeSchema = createInsertSchema(trades)
  .omit({
    id: true,
    userId: true,
    profitLoss: true,
    isWin: true,
    returnPercentage: true,
    daysOpen: true,
    profitLossPercent: true,
    closeDate: true
  })
  .extend({
    tradeType: z.enum(tradeTypes),
    optionType: z.enum(optionTypes).optional(),
    strategy: z.string().optional(),
    strikePrice: z.number().optional(),
    premium: z.number().optional(),
    quantity: z.number().int().positive(),
    entryPrice: z.number().optional(),
    exitPrice: z.number().optional(),
    tradeDate: z.string().transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Invalid trade date");
      return date;
    }),
    expirationDate: z.string().transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Invalid expiration date");
      return date;
    }).optional(),
    status: z.enum(["open", "closed"]).default("open"),
    sharesAssigned: z.number().int().optional(),
    assignmentPrice: z.number().optional(),
    commission: z.number().min(0).optional(),
    fees: z.number().min(0).optional(),
    metadata: z.record(z.unknown()).optional(),
  }).superRefine((data, ctx) => {
    if (data.tradeType === 'option') {
      if (!data.optionType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Option type is required for option trades",
        });
      }
      if (!data.strikePrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Strike price is required for option trades",
        });
      }
      if (!data.premium) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Premium is required for option trades",
        });
      }
      if (!data.expirationDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expiration date is required for option trades",
        });
      }
    } else {
      if (!data.entryPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Entry price is required for non-option trades",
        });
      }
    }
  });

export const insertSharePositionSchema = createInsertSchema(sharePositions)
  .omit({ id: true, lastUpdated: true })
  .extend({
    quantity: z.number().int(),
    averageCost: z.number().positive(),
  });

export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    totalProfitLoss: true,
    tradeCount: true,
    winCount: true,
    averageReturn: true,
    rank: true
  });

export const insertTransactionSchema = createInsertSchema(accountTransactions)
  .omit({
    id: true,
    userId: true,
    date: true
  })
  .extend({
    type: z.enum(transactionTypes),
    amount: z.number().positive(),
    date: z.string().transform((val) => new Date(val))
  });

export const userPreferencesSchema = z.object({
  defaultPlatform: z.enum(tradingPlatforms).optional(),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  notifications: z.object({
    email: z.boolean().default(true),
    web: z.boolean().default(true),
  }).default({}),
});

export const platformSettingsSchema = z.object({
  id: z.enum(tradingPlatforms),
  name: z.string(),
  accountId: z.string().optional(),
  marginEnabled: z.boolean().default(false),
  marginRate: z.number().optional(),
  feeStructure: z.object({
    perContract: z.number().default(0),
    base: z.number().default(0),
    assignment: z.number().default(0),
    exercise: z.number().default(0),
  }),
  enabled: z.boolean().default(true),
  currentBalance: z.number().default(0),
  totalDeposited: z.number().default(0),
  totalWithdrawn: z.number().default(0),
  totalFees: z.number().default(0),
  accountValue: z.number().default(0),
});

export const updateUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    password: true,
    createdAt: true,
    updatedAt: true
  })
  .extend({
    platforms: z.array(platformSettingsSchema).default([]),
    preferences: userPreferencesSchema.default({}),
  });

// Zod schemas for new features
export const insertTradeIdeaSchema = createInsertSchema(tradeIdeas)
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true
  })
  .extend({
    visibility: z.enum(visibilityTypes),
    optionType: z.enum(optionTypes).optional(),
    confidence: z.number().int().min(1).max(10).optional(),
  });

export const insertScannerConfigSchema = createInsertSchema(scannerConfigs)
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true
  })
  .extend({
    criteria: z.object({
      optionType: z.enum(optionTypes).optional(),
      minVolume: z.number().optional(),
      maxPrice: z.number().optional(),
      minDelta: z.number().optional(),
      maxDelta: z.number().optional(),
      minIV: z.number().optional(),
      maxIV: z.number().optional(),
      daysToExpiration: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
      priceRange: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
    }),
  });

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type PlatformSettings = z.infer<typeof platformSettingsSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type SharePosition = typeof sharePositions.$inferSelect;
export type InsertSharePosition = z.infer<typeof insertSharePositionSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type AccountTransaction = typeof accountTransactions.$inferSelect;

export type LeaderboardMetric = "totalProfitLoss" | "winRate" | "tradeCount" | "averageReturn";

export const leaderboardMetricSchema = z.object({
  metric: z.enum(["totalProfitLoss", "winRate", "tradeCount", "averageReturn"]),
  order: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().positive().default(10)
});

export type LeaderboardQuery = z.infer<typeof leaderboardMetricSchema>;

// Type exports for new features
export type InsertTradeIdea = z.infer<typeof insertTradeIdeaSchema>;
export type TradeIdea = typeof tradeIdeas.$inferSelect;
export type ScannerConfig = typeof scannerConfigs.$inferSelect;
export type InsertScannerConfig = z.infer<typeof insertScannerConfigSchema>;
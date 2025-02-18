import { pgTable, text, serial, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Categorize option types by whether they are credit or debit trades
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  platforms: jsonb("platforms").default('[]'),
  preferences: jsonb("preferences").default('{}'),
  marginEnabled: boolean("margin_enabled").default(false),
  marginRate: decimal("margin_rate"),
  totalProfitLoss: decimal("total_profit_loss").default('0'),
  tradeCount: integer("trade_count").default(0),
  winCount: integer("win_count").default(0),
  averageReturn: decimal("average_return").default('0'),
  rank: integer("rank"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const basePremiumSchema = z.number().or(z.string()).transform(val =>
  typeof val === 'string' ? parseFloat(val) : val
);

const optionLegSchema = z.object({
  optionType: z.enum([...debitOptionTypes, ...creditOptionTypes] as const),
  strikePrice: basePremiumSchema,
  premium: basePremiumSchema.refine(val => val > 0, {
    message: "Premium must be a positive number"
  }),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().int().positive()
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  underlyingAsset: text("underlying_asset").notNull(),
  optionType: text("option_type").notNull(),
  strikePrice: decimal("strike_price"),  // For single-leg trades
  premium: decimal("premium").notNull(),
  quantity: integer("quantity").notNull(),
  platform: text("platform"),
  useMargin: boolean("use_margin").default(false),
  notes: text("notes"),
  tags: text("tags").array(),
  tradeDate: timestamp("trade_date").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  legs: jsonb("legs").default('[]'), // For multi-leg trades
  profitLoss: decimal("profit_loss"),
  isWin: boolean("is_win"),
  returnPercentage: decimal("return_percentage"),
  closeDate: timestamp("close_date"),
  closePrice: decimal("close_price"),
  wasAssigned: boolean("was_assigned").default(false),
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

export const insertTradeSchema = createInsertSchema(trades)
  .omit({
    id: true,
    userId: true,
    profitLoss: true,
    isWin: true,
    returnPercentage: true
  })
  .extend({
    optionType: z.enum(optionTypes),
    strikePrice: basePremiumSchema.optional(),
    premium: basePremiumSchema,
    quantity: z.number().int().positive(),
    legs: z.array(optionLegSchema).optional(),
    tradeDate: z.string().transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Invalid trade date");
      return date;
    }),
    expirationDate: z.string().transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Invalid expiration date");
      return date;
    }),
  }).superRefine((data, ctx) => {
    // Transform premium based on option type
    if (debitOptionTypes.includes(data.optionType as typeof debitOptionTypes[number])) {
      data.premium = -Math.abs(data.premium);
    } else {
      data.premium = Math.abs(data.premium);
    }
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
  feeStructure: z.object({
    perContract: z.number().default(0),
    base: z.number().default(0),
    assignment: z.number().default(0),
    exercise: z.number().default(0),
  }),
  enabled: z.boolean().default(true),
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type PlatformSettings = z.infer<typeof platformSettingsSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export type LeaderboardMetric = "totalProfitLoss" | "winRate" | "tradeCount" | "averageReturn";

export const leaderboardMetricSchema = z.object({
  metric: z.enum(["totalProfitLoss", "winRate", "tradeCount", "averageReturn"]),
  order: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().positive().default(10)
});

export type LeaderboardQuery = z.infer<typeof leaderboardMetricSchema>;
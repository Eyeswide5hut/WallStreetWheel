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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  platforms: jsonb("platforms").default('[]'),
  preferences: jsonb("preferences").default('{}'),
  marginEnabled: boolean("margin_enabled").default(false),
  marginRate: decimal("margin_rate"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const optionTypes = [
  "long_call",
  "long_put",
  "covered_call",
  "cash_secured_put",
  "naked_call",
  "naked_put",
  "call_spread",
  "put_spread",
  "iron_condor",
  "butterfly",
] as const;

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  underlyingAsset: text("underlying_asset").notNull(),
  optionType: text("option_type").notNull(),
  strikePrice: decimal("strike_price").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  premium: decimal("premium").notNull(),
  quantity: integer("quantity").notNull(),
  platform: text("platform"),
  useMargin: boolean("use_margin").default(false),
  notes: text("notes"),
  tags: text("tags").array(),
  tradeDate: timestamp("trade_date").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true
});

export const insertTradeSchema = createInsertSchema(trades)
  .omit({
    id: true,
    userId: true
  })
  .extend({
    optionType: z.enum(optionTypes),
    strikePrice: z.number().or(z.string()).transform(val => 
      typeof val === 'string' ? parseFloat(val) : val
    ),
    premium: z.number().or(z.string()).transform(val => 
      typeof val === 'string' ? parseFloat(val) : val
    ),
    quantity: z.number().int().positive(),
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
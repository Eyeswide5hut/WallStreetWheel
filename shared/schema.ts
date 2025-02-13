import { pgTable, text, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  platform: text("platform"),
  useMargin: boolean("use_margin").default(false),
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
  strikePrice: text("strike_price").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  premium: text("premium").notNull(),
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
    strikePrice: z.string().transform((val) => val.toString()),
    premium: z.string().transform((val) => val.toString()),
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
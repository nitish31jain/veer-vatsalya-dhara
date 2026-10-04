import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uuid,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

// Team members (delivery staff and admins) authorised in the admin console.
// Matched to a Google account by email. Owners from ADMIN_EMAILS are not stored here.
export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  // "delivery" | "admin" (admins can also deliver)
  role: text("role").notNull().default("delivery"),
  active: boolean("active").notNull().default(true),
  addedBy: text("added_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
  // 10-digit Indian mobile number, without +91
  whatsapp: text("whatsapp"),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  // Optional Hindi versions, shown when the app language is Hindi
  nameHi: text("name_hi"),
  descriptionHi: text("description_hi"),
  tokens: integer("tokens").notNull(),
  pricePaise: integer("price_paise").notNull(),
  active: boolean("active").notNull().default(true),
  // Only offered to admins while test mode is on (Admin → Plans)
  testOnly: boolean("test_only").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    // Also used as the Cashfree order_id
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    planId: uuid("plan_id").references(() => plans.id),
    planName: text("plan_name").notNull(),
    tokens: integer("tokens").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    // PENDING | PAID | FAILED
    status: text("status").notNull().default("PENDING"),
    paymentSessionId: text("payment_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("orders_user_idx").on(t.userId)],
);

// Each purchase (or manual grant) creates one batch with its own 45-day expiry.
export const tokenBatches = pgTable(
  "token_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    orderId: text("order_id").unique().references(() => orders.id),
    // "purchase" | "manual"
    source: text("source").notNull(),
    note: text("note"),
    tokensTotal: integer("tokens_total").notNull(),
    tokensRemaining: integer("tokens_remaining").notNull(),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("batches_user_idx").on(t.userId, t.expiresAt)],
);

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    deliveryDate: date("delivery_date").notNull(),
    packets: integer("packets").notNull(),
    markedBy: text("marked_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("deliveries_user_date_idx").on(t.userId, t.deliveryDate)],
);

// Which batches a delivery drew its tokens from, so a delivery can be undone.
export const deliveryAllocations = pgTable("delivery_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryId: uuid("delivery_id")
    .notNull()
    .references(() => deliveries.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id").notNull().references(() => tokenBatches.id),
  tokens: integer("tokens").notNull(),
});

export type AuditMeta = {
  planName?: string;
  planNameHi?: string | null;
  amountPaise?: number;
  tokens?: number;
  packets?: number;
  /** Delivery date, YYYY-MM-DD */
  day?: string;
  note?: string;
};

// Every token change on a customer's account, shown on their page.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    // purchase | grant | delivery | delivery_undo
    action: text("action").notNull(),
    tokensDelta: integer("tokens_delta").notNull(),
    // English text, kept for reference; the UI renders from action + meta in the chosen language
    description: text("description").notNull(),
    meta: jsonb("meta").$type<AuditMeta>(),
    actorEmail: text("actor_email").notNull(),
    actorName: text("actor_name").notNull(),
    // customer | admin | delivery | system
    actorRole: text("actor_role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_user_idx").on(t.userId, t.createdAt)],
);

// App-wide switches editable from the admin console, e.g. test_mode.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Staff = typeof staff.$inferSelect;
export type User = typeof users.$inferSelect;
export type Plan = typeof plans.$inferSelect;

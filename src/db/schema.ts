import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const tz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: tz("created_at").notNull().defaultNow(),
  /** Landing page slug the user signed up from (src/marketing), e.g. "crypto". Null = homepage/direct. */
  signupSource: text("signup_source"),
  /** UTM parameters of the ad that brought them, as a query string, e.g. "utm_source=meta&utm_campaign=oct". */
  signupCampaign: text("signup_campaign"),

  // Dead man's switch
  switchEnabled: boolean("switch_enabled").notNull().default(false),
  /** active = waiting for next check-in, warning = reminders being sent, triggered = info released */
  switchStatus: text("switch_status").$type<"active" | "warning" | "triggered">().notNull().default("active"),
  checkInIntervalDays: integer("check_in_interval_days").notNull().default(30),
  gracePeriodDays: integer("grace_period_days").notNull().default(14),
  lastCheckInAt: tz("last_check_in_at").notNull().defaultNow(),
  warningStartedAt: tz("warning_started_at"),
  lastReminderAt: tz("last_reminder_at"),
  triggeredAt: tz("triggered_at"),
  /** encrypted one-click "I'm OK" token included in reminder emails (stable for one warning period) */
  checkInToken: text("check_in_token"),
});

export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: tz("created_at").notNull().defaultNow(),
    expiresAt: tz("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginTokens = pgTable(
  "login_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    createdAt: tz("created_at").notNull().defaultNow(),
    expiresAt: tz("expires_at").notNull(),
    usedAt: tz("used_at"),
    /** Attribution carried from the landing page to account creation (see users.signupSource). */
    signupSource: text("signup_source"),
    signupCampaign: text("signup_campaign"),
  },
  (t) => [index("login_tokens_email_idx").on(t.email)],
);

export const recipients = pgTable(
  "recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    relationship: text("relationship"),
    /** encrypted */
    personalMessage: text("personal_message"),
    createdAt: tz("created_at").notNull().defaultNow(),
    notifiedAt: tz("notified_at"),
    /** sha256 of the access link token, set when the switch is triggered */
    accessTokenHash: text("access_token_hash").unique(),
    releasedAt: tz("released_at"),
  },
  (t) => [index("recipients_user_idx").on(t.userId)],
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /** encrypted JSON of ItemPayload */
    payload: text("payload").notNull(),
    shareWithAll: boolean("share_with_all").notNull().default(true),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("items_user_idx").on(t.userId)],
);

export const itemRecipients = pgTable(
  "item_recipients",
  {
    itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id").notNull().references(() => recipients.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.recipientId] })],
);

export type User = typeof users.$inferSelect;
export type Recipient = typeof recipients.$inferSelect;
export type ItemRow = typeof items.$inferSelect;

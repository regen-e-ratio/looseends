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
  /** Set when the user finishes (or skips) the first-time setup at /onboarding. Null = show onboarding. */
  onboardedAt: tz("onboarded_at"),

  // Dead man's switch
  switchEnabled: boolean("switch_enabled").notNull().default(false),
  /**
   * How a release is triggered (never both):
   * - checkin: we email the user every N days; missed check-ins + grace period → release
   * - claim:   no emails; a trusted contact requests access and the user has gracePeriodDays to reject it
   */
  switchMode: text("switch_mode").$type<"checkin" | "claim">().notNull().default("checkin"),
  /** active = nothing pending, warning = reminders being sent / claim pending, triggered = info released */
  switchStatus: text("switch_status").$type<"active" | "warning" | "triggered">().notNull().default("active"),
  checkInIntervalDays: integer("check_in_interval_days").notNull().default(30),
  /** checkin mode: days of reminders before release. claim mode: days the user has to reject a claim. */
  gracePeriodDays: integer("grace_period_days").notNull().default(14),
  lastCheckInAt: tz("last_check_in_at").notNull().defaultNow(),
  warningStartedAt: tz("warning_started_at"),
  lastReminderAt: tz("last_reminder_at"),
  triggeredAt: tz("triggered_at"),
  /** claim mode: the trusted contact whose access request is pending (status = warning). */
  claimRecipientId: uuid("claim_recipient_id"),
  /** encrypted one-click "I'm OK" token included in reminder emails (stable for one warning period) */
  checkInToken: text("check_in_token"),

  // Subscription (Paddle is the merchant of record; see src/lib/billing.ts). Written only from Paddle's data.
  /** none = never subscribed. Otherwise Paddle's subscription status. */
  billingStatus: text("billing_status").$type<BillingStatus>().notNull().default("none"),
  billingCustomerId: text("billing_customer_id"),
  billingSubscriptionId: text("billing_subscription_id"),
  /** End of the period that has been paid for (the next renewal date while active). */
  billingPeriodEndsAt: tz("billing_period_ends_at"),
  /** Set when the subscription is scheduled to end (the user cancelled; it runs until this date). */
  billingCancelsAt: tz("billing_cancels_at"),
  /** Paddle's updated_at of the subscription state stored here. Older data (late webhooks) is ignored. */
  billingUpdatedAt: tz("billing_updated_at"),
});

export type BillingStatus = "none" | "active" | "trialing" | "past_due" | "paused" | "canceled";

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
    /** encrypted */
    personalMessage: text("personal_message"),
    createdAt: tz("created_at").notNull().defaultNow(),
    notifiedAt: tz("notified_at"),
    /** sha256 of the access link token, set when the switch is triggered */
    accessTokenHash: text("access_token_hash").unique(),
    /** sha256 of this contact's personal "request access" link (claim mode only). */
    claimTokenHash: text("claim_token_hash").unique(),
    /** Set by whichever cron run is sending this contact's release email, so two runs never both send. */
    releaseAttemptAt: tz("release_attempt_at"),
    claimLinkSentAt: tz("claim_link_sent_at"),
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

/** Fixed-window counters for rate limiting (sign-in emails, user-triggered emails, claims). */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: tz("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

/** Short leases so a scheduled job never runs twice at the same time (Vercel may deliver a cron twice). */
export const jobLeases = pgTable("job_leases", {
  name: text("name").primaryKey(),
  lockedUntil: tz("locked_until").notNull(),
});

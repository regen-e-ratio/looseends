ALTER TABLE "users" ADD COLUMN "billing_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_subscription_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_period_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_cancels_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_updated_at" timestamp with time zone;
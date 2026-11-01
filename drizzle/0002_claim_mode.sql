ALTER TABLE "recipients" ADD COLUMN "claim_token_hash" text;--> statement-breakpoint
ALTER TABLE "recipients" ADD COLUMN "claim_link_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "switch_mode" text DEFAULT 'checkin' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "claim_recipient_id" uuid;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_claim_token_hash_unique" UNIQUE("claim_token_hash");
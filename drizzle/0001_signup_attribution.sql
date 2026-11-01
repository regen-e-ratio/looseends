ALTER TABLE "login_tokens" ADD COLUMN "signup_source" text;--> statement-breakpoint
ALTER TABLE "login_tokens" ADD COLUMN "signup_campaign" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_source" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_campaign" text;
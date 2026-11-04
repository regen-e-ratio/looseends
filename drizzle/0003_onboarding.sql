ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
-- Existing users were set up before onboarding existed: never send them through it.
UPDATE "users" SET "onboarded_at" = "created_at" WHERE "onboarded_at" IS NULL;

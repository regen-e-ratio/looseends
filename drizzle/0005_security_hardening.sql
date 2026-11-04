CREATE TABLE "job_leases" (
	"name" text PRIMARY KEY NOT NULL,
	"locked_until" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
ALTER TABLE "recipients" ADD COLUMN "release_attempt_at" timestamp with time zone;
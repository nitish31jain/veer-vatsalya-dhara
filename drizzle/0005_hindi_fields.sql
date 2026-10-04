ALTER TABLE "audit_log" ADD COLUMN "meta" jsonb;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "name_hi" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "description_hi" text;
ALTER TABLE "users" DROP CONSTRAINT "users_assigned_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "assigned_staff_id";
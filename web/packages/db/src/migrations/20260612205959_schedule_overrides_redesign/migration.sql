CREATE TYPE "schedule_override_kind" AS ENUM('time_off', 'custom_hours');--> statement-breakpoint
ALTER TABLE "schedule_overrides" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "schedule_overrides" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "schedule_overrides" ADD COLUMN "kind" "schedule_override_kind";--> statement-breakpoint
UPDATE "schedule_overrides"
SET "start_date" = "date",
    "end_date"   = "date",
    "kind"       = CASE WHEN "is_day_off" THEN 'time_off' ELSE 'custom_hours' END::"schedule_override_kind";--> statement-breakpoint
UPDATE "schedule_overrides" SET "start_time" = NULL, "end_time" = NULL WHERE "kind" = 'time_off';--> statement-breakpoint
DELETE FROM "schedule_overrides" WHERE "kind" = 'custom_hours' AND ("start_time" IS NULL OR "end_time" IS NULL);--> statement-breakpoint
ALTER TABLE "schedule_overrides" ALTER COLUMN "start_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_overrides" ALTER COLUMN "end_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_overrides" ALTER COLUMN "kind" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_overrides" DROP CONSTRAINT "uq_schedule_overrides_resource_date";--> statement-breakpoint
ALTER TABLE "schedule_overrides" DROP COLUMN "date";--> statement-breakpoint
ALTER TABLE "schedule_overrides" DROP COLUMN "is_day_off";--> statement-breakpoint
ALTER TABLE "working_hours" DROP CONSTRAINT "uq_working_hours_resource_day";--> statement-breakpoint
CREATE INDEX "idx_schedule_overrides_resource_dates" ON "schedule_overrides" ("resource_id","start_date","end_date");--> statement-breakpoint
ALTER TABLE "schedule_overrides" ADD CONSTRAINT "schedule_overrides_date_range_check" CHECK (end_date >= start_date);--> statement-breakpoint
ALTER TABLE "schedule_overrides" ADD CONSTRAINT "schedule_overrides_times_paired_check" CHECK ((start_time IS NULL) = (end_time IS NULL));--> statement-breakpoint
ALTER TABLE "schedule_overrides" ADD CONSTRAINT "schedule_overrides_custom_hours_times_check" CHECK (kind <> 'custom_hours' OR start_time IS NOT NULL);--> statement-breakpoint
ALTER TABLE "schedule_overrides" ADD CONSTRAINT "schedule_overrides_time_order_check" CHECK (start_time IS NULL OR start_time < end_time);--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_time_check" CHECK (start_time < end_time);

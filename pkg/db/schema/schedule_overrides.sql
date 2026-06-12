CREATE TABLE "schedule_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"resource_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"kind" "schedule_override_kind" NOT NULL,
	"start_time" time,
	"end_time" time,
	"reason" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_overrides_date_range_check" CHECK (end_date >= start_date),
	CONSTRAINT "schedule_overrides_times_paired_check" CHECK ((start_time IS NULL) = (end_time IS NULL)),
	CONSTRAINT "schedule_overrides_custom_hours_times_check" CHECK (kind <> 'custom_hours' OR start_time IS NOT NULL),
	CONSTRAINT "schedule_overrides_time_order_check" CHECK (start_time IS NULL OR start_time < end_time)
);

CREATE INDEX "idx_schedule_overrides_resource_dates" ON "schedule_overrides" ("resource_id","start_date","end_date");
ALTER TABLE "schedule_overrides" ADD CONSTRAINT "schedule_overrides_resource_id_resources_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE;

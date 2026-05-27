CREATE TABLE "schedule_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"resource_id" uuid NOT NULL,
	"date" date NOT NULL,
	"is_day_off" boolean DEFAULT false NOT NULL,
	"start_time" time,
	"end_time" time,
	"reason" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_schedule_overrides_resource_date" UNIQUE("resource_id","date")
);

ALTER TABLE "schedule_overrides" ADD CONSTRAINT "schedule_overrides_resource_id_resources_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE;

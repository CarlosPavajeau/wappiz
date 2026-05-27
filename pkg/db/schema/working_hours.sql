CREATE TABLE "working_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"resource_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_working_hours_resource_day" UNIQUE("resource_id","day_of_week"),
	CONSTRAINT "working_hours_day_of_week_check" CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);

CREATE INDEX "idx_working_hours_resource_id" ON "working_hours" ("resource_id");
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_resource_id_resources_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE;

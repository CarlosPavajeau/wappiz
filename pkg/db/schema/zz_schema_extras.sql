-- Schema that Drizzle cannot model. `make generate-sql` copies this file into
-- pkg/db/schema (as zz_schema_extras.sql) so sqlc and the Go test harness see
-- it. Production gets the same statements through the Drizzle migration
-- 20261003165226_appointments_overlap_exclusion, so keep both in sync. Comments
-- here must not contain semicolons: the Go test harness splits on them.

-- Reject overlapping active appointments per resource and per customer. The
-- Go code maps violations of these constraint names to a 409.
ALTER TABLE "appointments" ADD CONSTRAINT "no_overlap" EXCLUDE USING gist (
  "resource_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
) WHERE (status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status]));

ALTER TABLE "appointments" ADD CONSTRAINT "no_customer_overlap" EXCLUDE USING gist (
  "tenant_id" WITH =,
  "customer_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
) WHERE (status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status]));

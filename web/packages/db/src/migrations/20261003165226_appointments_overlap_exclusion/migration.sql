-- The Drizzle schema declared no_overlap and no_customer_overlap as plain
-- GiST indexes, which never reject anything, so databases built from the
-- migrations allowed two customers to book the same resource at the same
-- time. Production already had them as EXCLUDE constraints (created before
-- the schema was introspected). This migration converges every database on
-- EXCLUDE constraints of the same names, whichever form each one has today.
-- The Go code maps violations of these constraint names to a 409.
--
-- ADD CONSTRAINT fails if overlapping active appointments already exist.
-- Check first (must return 0 for both):
--
--   SELECT count(*) FROM appointments a JOIN appointments b
--     ON a.resource_id = b.resource_id AND a.id < b.id
--    AND tstzrange(a.starts_at, a.ends_at) && tstzrange(b.starts_at, b.ends_at)
--    WHERE a.status NOT IN ('cancelled', 'no_show')
--      AND b.status NOT IN ('cancelled', 'no_show');
--
--   SELECT count(*) FROM appointments a JOIN appointments b
--     ON a.tenant_id = b.tenant_id AND a.customer_id = b.customer_id AND a.id < b.id
--    AND tstzrange(a.starts_at, a.ends_at) && tstzrange(b.starts_at, b.ends_at)
--    WHERE a.status NOT IN ('cancelled', 'no_show')
--      AND b.status NOT IN ('cancelled', 'no_show');
--
-- Drizzle cannot model exclusion constraints; keep scripts/schema-extras.sql
-- in sync for the Go test schema.
-- A constraint-backed index cannot be dropped with DROP INDEX, so drop the
-- constraint form first, then the plain index form. Both are no-ops when
-- absent.
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "no_customer_overlap";--> statement-breakpoint
DROP INDEX IF EXISTS "no_customer_overlap";--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "no_overlap";--> statement-breakpoint
DROP INDEX IF EXISTS "no_overlap";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "no_overlap" EXCLUDE USING gist (
  "resource_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
) WHERE (status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status]));--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "no_customer_overlap" EXCLUDE USING gist (
  "tenant_id" WITH =,
  "customer_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
) WHERE (status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status]));

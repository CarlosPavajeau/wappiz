-- Services had no deletion marker: is_active is toggled by the owner to
-- pause bookings, so it cannot double as one. deleted_at marks deletion and
-- is_active keeps its booking meaning. No backfill: no endpoint deleted
-- services before this, so every existing inactive row is a paused one.
ALTER TABLE "services" ADD COLUMN "deleted_at" timestamp with time zone;

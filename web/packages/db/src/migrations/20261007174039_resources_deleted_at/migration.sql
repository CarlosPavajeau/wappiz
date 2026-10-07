-- Resources used is_active = false as their soft-delete marker, which tied
-- plan quota to a flag that should only control whether a resource takes
-- appointments. deleted_at now marks deletion and is_active keeps its
-- scheduling meaning.
ALTER TABLE "resources" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
-- Until this migration the delete endpoint was the only writer of
-- is_active = false, so every inactive resource is a deleted one. Their
-- deletion time was never recorded; now() is the closest truthful value.
UPDATE "resources" SET "deleted_at" = now() WHERE "is_active" = false;

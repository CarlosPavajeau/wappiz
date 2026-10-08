-- Predefined fields were seeded without a question and the bot never asked them,
-- so they hold no answers. Rows the tenant gave a question to are kept as
-- ordinary fields.
DELETE FROM "tenant_flow_fields" WHERE "question" IS NULL OR btrim("question") = '';--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" DROP COLUMN "field_type";--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ALTER COLUMN "question" SET NOT NULL;--> statement-breakpoint
DROP TYPE "flow_field_type";
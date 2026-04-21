CREATE TYPE "flow_field_type" AS ENUM('predefined', 'custom');--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ALTER COLUMN "field_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ALTER COLUMN "field_type" SET DATA TYPE "flow_field_type" USING "field_type"::"flow_field_type";--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ALTER COLUMN "field_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ADD CONSTRAINT "uq_tenant_field_key" UNIQUE("tenant_id","field_key");
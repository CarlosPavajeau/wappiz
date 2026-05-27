CREATE TABLE "tenant_flow_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"field_key" varchar(50) NOT NULL,
	"field_type" "flow_field_type" NOT NULL,
	"question" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_field_key" UNIQUE("tenant_id","field_key")
);

ALTER TABLE "tenant_flow_fields" ADD CONSTRAINT "tenant_flow_fields_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;

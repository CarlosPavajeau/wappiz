CREATE TABLE "tenant_flow_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"field_key" varchar(50) NOT NULL,
	"question" text NOT NULL,
	"field_type" "flow_field_type" DEFAULT 'text'::"flow_field_type" NOT NULL,
	"min_length" smallint,
	"max_length" smallint,
	"min_value" integer,
	"max_value" integer,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_one_time" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_field_key" UNIQUE("tenant_id","field_key"),
	CONSTRAINT "tenant_flow_fields_question_length_check" CHECK (char_length(question) BETWEEN 2 AND 500),
	CONSTRAINT "tenant_flow_fields_text_length_check" CHECK (field_type <> 'text' OR (min_length IS NOT NULL AND max_length IS NOT NULL AND min_length >= 0 AND min_length <= max_length AND max_length BETWEEN 1 AND 1000)),
	CONSTRAINT "tenant_flow_fields_length_only_text_check" CHECK (field_type = 'text' OR (min_length IS NULL AND max_length IS NULL)),
	CONSTRAINT "tenant_flow_fields_value_only_number_check" CHECK (field_type = 'number' OR (min_value IS NULL AND max_value IS NULL)),
	CONSTRAINT "tenant_flow_fields_value_range_check" CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value)
);

ALTER TABLE "tenant_flow_fields" ADD CONSTRAINT "tenant_flow_fields_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;

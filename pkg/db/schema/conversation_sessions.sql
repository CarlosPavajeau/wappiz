CREATE TABLE "conversation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"whatsapp_config_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"step" varchar(50) NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_sessions_tenant_id_client_id_key" UNIQUE("tenant_id","customer_id")
);

CREATE INDEX "idx_sessions_active_lookup" ON "conversation_sessions" ("tenant_id","customer_id","expires_at");
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_58HeJZwRLG95_fkey" FOREIGN KEY ("whatsapp_config_id") REFERENCES "tenant_whatsapp_configs"("id");
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");

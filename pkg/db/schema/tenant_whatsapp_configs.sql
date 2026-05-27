CREATE TABLE "tenant_whatsapp_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL CONSTRAINT "tenant_whatsapp_configs_tenant_id_key" UNIQUE,
	"waba_id" varchar(100),
	"phone_number_id" varchar(100) CONSTRAINT "tenant_whatsapp_configs_phone_number_id_key" UNIQUE,
	"display_phone_number" varchar(20),
	"access_token" text,
	"token_expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activation_status" "whatsapp_activation_status" DEFAULT 'pending'::"whatsapp_activation_status" NOT NULL,
	"activation_requested_at" timestamp with time zone,
	"activation_notes" text,
	"activation_contact_email" text,
	"reject_reason" text
);

ALTER TABLE "tenant_whatsapp_configs" ADD CONSTRAINT "tenant_whatsapp_configs_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;

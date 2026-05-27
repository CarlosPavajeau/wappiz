CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"name" varchar(255),
	"is_blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"no_show_count" integer DEFAULT 0 NOT NULL,
	"late_cancel_count" integer DEFAULT 0 NOT NULL,
	"documentId" varchar(20),
	"birth_date" date,
	"email" varchar(255),
	"address" varchar(255),
	CONSTRAINT "clients_tenant_id_phone_number_key" UNIQUE("tenant_id","phone_number")
);

ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;

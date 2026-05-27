CREATE TABLE "appointment_penalty_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"appointment_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"event_type" varchar(20) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_penalty_events_unique" UNIQUE("appointment_id","event_type")
);

CREATE INDEX "idx_appointment_penalty_events_customer" ON "appointment_penalty_events" ("tenant_id","customer_id","occurred_at" DESC);
ALTER TABLE "appointment_penalty_events" ADD CONSTRAINT "appointment_penalty_events_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;
ALTER TABLE "appointment_penalty_events" ADD CONSTRAINT "appointment_penalty_events_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "appointment_penalty_events" ADD CONSTRAINT "appointment_penalty_events_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;

CREATE TABLE "appointment_reminder_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"appointment_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"reminder_type" varchar(10) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_reminder_events_unique" UNIQUE("appointment_id","reminder_type")
);

CREATE INDEX "idx_appointment_reminder_events_pending" ON "appointment_reminder_events" ("sent_at","attempts","created_at") WHERE (sent_at IS NULL);
ALTER TABLE "appointment_reminder_events" ADD CONSTRAINT "appointment_reminder_events_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;
ALTER TABLE "appointment_reminder_events" ADD CONSTRAINT "appointment_reminder_events_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "appointment_reminder_events" ADD CONSTRAINT "appointment_reminder_events_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;

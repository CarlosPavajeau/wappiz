CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "appointment_status" DEFAULT 'pending'::"appointment_status" NOT NULL,
	"cancelled_by" text,
	"cancel_reason" varchar(500),
	"price_at_booking" numeric(10,2) NOT NULL,
	"reminder_24h_sent_at" timestamp with time zone,
	"reminder_1h_sent_at" timestamp with time zone,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);

CREATE INDEX "idx_appointments_cancelled_recent" ON "appointments" ("cancelled_at" DESC) WHERE ((status = 'cancelled'::appointment_status) AND (cancelled_at IS NOT NULL));
CREATE INDEX "idx_appointments_reminder" ON "appointments" ("starts_at","reminder_24h_sent_at","reminder_1h_sent_at") WHERE (status = 'confirmed'::appointment_status);
CREATE INDEX "idx_appointments_status_date" ON "appointments" ("tenant_id","status","starts_at");
CREATE INDEX "idx_appointments_unattended" ON "appointments" ("starts_at") WHERE (status = 'confirmed'::appointment_status);
CREATE INDEX "no_customer_overlap" ON "appointments" USING gist ("tenant_id","customer_id",tstzrange(starts_at, ends_at)) WHERE (status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status]));
CREATE INDEX "no_overlap" ON "appointments" USING gist ("resource_id",tstzrange(starts_at, ends_at)) WHERE (status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status]));
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_resource_id_resources_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id");
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id");
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");

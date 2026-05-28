CREATE TABLE "appointment_field_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"appointment_id" uuid NOT NULL,
	"field_key" varchar(50) NOT NULL,
	"response" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_appointment_field" UNIQUE("appointment_id","field_key")
);
--> statement-breakpoint
DROP INDEX "uq_tenant_active_subscription";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_active_subscription" ON "subscriptions" ("tenant_id","environment") WHERE ((status)::text = 'active'::text);--> statement-breakpoint
ALTER TABLE "sessions" RENAME CONSTRAINT "sessions_token_key" TO "sessions_token_unique";--> statement-breakpoint
ALTER TABLE "users" RENAME CONSTRAINT "users_email_key" TO "users_email_unique";--> statement-breakpoint
CREATE INDEX "idx_field_responses_appointment" ON "appointment_field_responses" ("appointment_id");--> statement-breakpoint
ALTER TABLE "appointment_field_responses" ADD CONSTRAINT "appointment_field_responses_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;
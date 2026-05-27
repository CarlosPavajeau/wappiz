CREATE TABLE "appointment_field_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"appointment_id" uuid NOT NULL,
	"field_key" varchar(50) NOT NULL,
	"response" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_appointment_field" UNIQUE("appointment_id","field_key")
);

CREATE INDEX "idx_field_responses_appointment" ON "appointment_field_responses" ("appointment_id");
ALTER TABLE "appointment_field_responses" ADD CONSTRAINT "appointment_field_responses_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;

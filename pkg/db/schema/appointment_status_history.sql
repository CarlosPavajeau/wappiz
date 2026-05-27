CREATE TABLE "appointment_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"appointment_id" uuid NOT NULL,
	"from_status" "appointment_status" NOT NULL,
	"to_status" "appointment_status" NOT NULL,
	"changed_by" text,
	"changed_by_role" varchar(20),
	"reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_status_history_appointment" ON "appointment_status_history" ("appointment_id");
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id");
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_changed_by_users_id_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id");

CREATE TYPE "appointment_status" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'check_in');--> statement-breakpoint
CREATE TYPE "whatsapp_activation_status" AS ENUM('pending', 'in_progress', 'active', 'failed');--> statement-breakpoint
CREATE TABLE "accounts" (
	"access_token" text,
	"access_token_expires_at" timestamp,
	"account_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY,
	"id_token" text,
	"password" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"name" varchar(255),
	"is_blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"no_show_count" integer DEFAULT 0 NOT NULL,
	"late_cancel_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "clients_tenant_id_phone_number_key" UNIQUE("tenant_id","phone_number")
);
--> statement-breakpoint
CREATE TABLE "jwks" (
	"created_at" timestamp(6) with time zone NOT NULL,
	"expires_at" timestamp(6) with time zone,
	"id" text PRIMARY KEY,
	"private_key" text NOT NULL,
	"public_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL CONSTRAINT "onboarding_progress_tenant_id_key" UNIQUE,
	"current_step" integer DEFAULT 1 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_services" (
	"resource_id" uuid,
	"service_id" uuid,
	CONSTRAINT "resource_services_pkey" PRIMARY KEY("resource_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'barber' NOT NULL,
	"avatar_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"resource_id" uuid NOT NULL,
	"date" date NOT NULL,
	"is_day_off" boolean DEFAULT false NOT NULL,
	"start_time" time,
	"end_time" time,
	"reason" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_schedule_overrides_resource_date" UNIQUE("resource_id","date")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"duration_minutes" integer NOT NULL,
	"buffer_minutes" integer DEFAULT 0 NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"impersonated_by" text,
	"ip_address" text,
	"token" text NOT NULL UNIQUE,
	"updated_at" timestamp NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_users" (
	"user_id" text,
	"tenant_id" uuid,
	"role" text NOT NULL,
	CONSTRAINT "tenant_users_pkey" PRIMARY KEY("user_id","tenant_id")
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL CONSTRAINT "tenants_slug_key" UNIQUE,
	"timezone" varchar(50) DEFAULT 'America/Bogota' NOT NULL,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"plan" varchar(20) DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp with time zone,
	"appointments_this_month" integer DEFAULT 0 NOT NULL,
	"month_reset_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"settings" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"ban_expires" timestamp(6) with time zone,
	"ban_reason" text,
	"banned" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY,
	"image" text,
	"name" text NOT NULL,
	"role" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"resource_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_working_hours_resource_day" UNIQUE("resource_id","day_of_week"),
	CONSTRAINT "working_hours_day_of_week_check" CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_appointment_penalty_events_customer" ON "appointment_penalty_events" ("tenant_id","customer_id","occurred_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_appointment_reminder_events_pending" ON "appointment_reminder_events" ("sent_at","attempts","created_at") WHERE (sent_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_status_history_appointment" ON "appointment_status_history" ("appointment_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_cancelled_recent" ON "appointments" ("cancelled_at" DESC) WHERE ((status = 'cancelled'::appointment_status) AND (cancelled_at IS NOT NULL));--> statement-breakpoint
CREATE INDEX "idx_appointments_reminder" ON "appointments" ("starts_at","reminder_24h_sent_at","reminder_1h_sent_at") WHERE (status = 'confirmed'::appointment_status);--> statement-breakpoint
CREATE INDEX "idx_appointments_status_date" ON "appointments" ("tenant_id","status","starts_at");--> statement-breakpoint
CREATE INDEX "idx_appointments_unattended" ON "appointments" ("starts_at") WHERE (status = 'confirmed'::appointment_status);--> statement-breakpoint
CREATE INDEX "no_customer_overlap" ON "appointments" USING gist ("tenant_id","customer_id",tstzrange(starts_at, ends_at)) WHERE (status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status]));--> statement-breakpoint
CREATE INDEX "no_overlap" ON "appointments" USING gist ("resource_id",tstzrange(starts_at, ends_at)) WHERE (status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status]));--> statement-breakpoint
CREATE INDEX "idx_sessions_active_lookup" ON "conversation_sessions" ("tenant_id","customer_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_services_tenant_id" ON "services" ("tenant_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verifications" ("identifier");--> statement-breakpoint
CREATE INDEX "idx_working_hours_resource_id" ON "working_hours" ("resource_id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appointment_penalty_events" ADD CONSTRAINT "appointment_penalty_events_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appointment_penalty_events" ADD CONSTRAINT "appointment_penalty_events_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appointment_penalty_events" ADD CONSTRAINT "appointment_penalty_events_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appointment_reminder_events" ADD CONSTRAINT "appointment_reminder_events_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appointment_reminder_events" ADD CONSTRAINT "appointment_reminder_events_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appointment_reminder_events" ADD CONSTRAINT "appointment_reminder_events_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id");--> statement-breakpoint
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_changed_by_users_id_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_resource_id_resources_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");--> statement-breakpoint
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_58HeJZwRLG95_fkey" FOREIGN KEY ("whatsapp_config_id") REFERENCES "tenant_whatsapp_configs"("id");--> statement-breakpoint
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resource_services" ADD CONSTRAINT "resource_services_resource_id_resources_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resource_services" ADD CONSTRAINT "resource_services_service_id_services_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "schedule_overrides" ADD CONSTRAINT "schedule_overrides_resource_id_resources_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tenant_whatsapp_configs" ADD CONSTRAINT "tenant_whatsapp_configs_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_resource_id_resources_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE;
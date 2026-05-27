CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL CONSTRAINT "tenants_slug_key" UNIQUE,
	"timezone" varchar(50) DEFAULT 'America/Bogota' NOT NULL,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"appointments_this_month" integer DEFAULT 0 NOT NULL,
	"month_reset_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"settings" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


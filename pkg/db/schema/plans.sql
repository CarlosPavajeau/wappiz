CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"external_id" varchar(100) NOT NULL CONSTRAINT "plans_external_id_key" UNIQUE,
	"external_price_id" varchar(100),
	"name" varchar(100) NOT NULL,
	"description" text,
	"price" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"interval" varchar(20),
	"features" jsonb DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"environment" varchar(20) DEFAULT 'production' NOT NULL
);

CREATE UNIQUE INDEX "uq_plans_external_id_environment" ON "plans" ("external_id","environment");

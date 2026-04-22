CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"external_id" varchar(100) NOT NULL UNIQUE,
	"external_price_id" varchar(100),
	"name" varchar(100) NOT NULL,
	"description" text,
	"price" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"interval" varchar(20),
	"features" jsonb DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subscription_id" uuid NOT NULL,
	"external_id" varchar(100) NOT NULL UNIQUE,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"external_id" varchar(100) NOT NULL UNIQUE,
	"external_customer_id" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_active_subscription" ON "subscriptions" ("tenant_id") WHERE status = 'active';--> statement-breakpoint
CREATE INDEX "idx_subscriptions_external_id" ON "subscriptions" ("external_id");--> statement-breakpoint
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id");
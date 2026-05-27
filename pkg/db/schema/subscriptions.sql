CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"external_id" varchar(100) NOT NULL CONSTRAINT "subscriptions_external_id_key" UNIQUE,
	"external_customer_id" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"environment" varchar(20) DEFAULT 'production' NOT NULL
);

CREATE INDEX "idx_subscriptions_external_id" ON "subscriptions" ("external_id","environment");
CREATE UNIQUE INDEX "uq_tenant_active_subscription" ON "subscriptions" ("tenant_id","environment") WHERE ((status)::text = 'active'::text);
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id");

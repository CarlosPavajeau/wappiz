ALTER TABLE "plans" ADD COLUMN "environment" varchar(20) DEFAULT 'production' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_orders" ADD COLUMN "environment" varchar(20) DEFAULT 'production' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "environment" varchar(20) DEFAULT 'production' NOT NULL;--> statement-breakpoint
DROP INDEX "uq_tenant_active_subscription";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_active_subscription" ON "subscriptions" ("tenant_id","environment") WHERE status = 'active';--> statement-breakpoint
DROP INDEX "idx_subscriptions_external_id";--> statement-breakpoint
CREATE INDEX "idx_subscriptions_external_id" ON "subscriptions" ("external_id","environment");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_plans_external_id_environment" ON "plans" ("external_id","environment");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_subscription_orders_external_id_environment" ON "subscription_orders" ("external_id","environment");
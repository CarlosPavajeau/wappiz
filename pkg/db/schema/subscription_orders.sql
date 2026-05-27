CREATE TABLE "subscription_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subscription_id" uuid NOT NULL,
	"external_id" varchar(100) NOT NULL CONSTRAINT "subscription_orders_external_id_key" UNIQUE,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"environment" varchar(20) DEFAULT 'production' NOT NULL
);

CREATE UNIQUE INDEX "uq_subscription_orders_external_id_environment" ON "subscription_orders" ("external_id","environment");
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id");

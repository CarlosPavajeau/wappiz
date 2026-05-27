CREATE TABLE "tenant_users" (
	"user_id" text,
	"tenant_id" uuid,
	"role" text NOT NULL,
	CONSTRAINT "tenant_users_pkey" PRIMARY KEY("user_id","tenant_id")
);

ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;

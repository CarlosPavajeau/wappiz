CREATE TABLE "resource_services" (
	"resource_id" uuid,
	"service_id" uuid,
	CONSTRAINT "resource_services_pkey" PRIMARY KEY("resource_id","service_id")
);

ALTER TABLE "resource_services" ADD CONSTRAINT "resource_services_resource_id_resources_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE;
ALTER TABLE "resource_services" ADD CONSTRAINT "resource_services_service_id_services_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE;

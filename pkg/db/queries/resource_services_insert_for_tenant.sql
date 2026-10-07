-- name: InsertResourceServicesForTenant :execrows
-- Links only services owned by the tenant that are not deleted, so a client
-- cannot attach another tenant's service to its resource. Each matching
-- service yields one row, so the affected count equals the number of distinct
-- valid ids; a smaller count means some ids were rejected.
INSERT INTO resource_services (resource_id, service_id)
SELECT sqlc.arg(resource_id)::uuid, s.id
FROM services s
WHERE s.id = ANY (sqlc.arg(service_ids)::uuid[])
  AND s.tenant_id = sqlc.arg(tenant_id)
  AND s.deleted_at IS NULL
ON CONFLICT DO NOTHING;

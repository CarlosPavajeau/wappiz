-- name: FindServicesWithAssignedResourceByTenantID :many
SELECT DISTINCT s.id,
                s.tenant_id,
                s.name,
                s.description,
                s.duration_minutes,
                s.buffer_minutes,
                s.price,
                s.is_active,
                s.sort_order,
                s.created_at
FROM services s
         JOIN resource_services rs ON rs.service_id = s.id
         JOIN resources r ON r.id = rs.resource_id AND r.is_active = true AND r.deleted_at IS NULL
WHERE s.tenant_id = $1
  AND s.is_active = true
ORDER BY s.created_at;
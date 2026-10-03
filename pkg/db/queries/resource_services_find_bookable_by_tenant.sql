-- name: FindBookableResourceServicesByTenant :many
SELECT r.id AS resource_id,
       r.name AS resource_name,
       COALESCE(r.avatar_url, '') AS resource_avatar_url,
       rs.service_id
FROM resources r
         JOIN resource_services rs ON rs.resource_id = r.id
         JOIN services s ON s.id = rs.service_id AND s.is_active = true
WHERE r.tenant_id = $1
  AND r.is_active = true
ORDER BY r.sort_order, r.created_at, rs.service_id;

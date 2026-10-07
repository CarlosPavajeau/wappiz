-- name: FindResourcesByServiceID :many
SELECT r.id,
       r.tenant_id,
       r.name,
       r.type,
       COALESCE(r.avatar_url, '') as avatar_url,
       r.is_active,
       r.sort_order,
       r.created_at
FROM resources r
         JOIN resource_services rs ON rs.resource_id = r.id
WHERE r.tenant_id = $1
  AND rs.service_id = $2
  AND r.is_active = true
  AND r.deleted_at IS NULL
ORDER BY r.created_at;
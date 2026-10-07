-- name: FindResourcesByTenant :many
SELECT id,
       tenant_id,
       name,
       type,
       COALESCE(avatar_url, '') as avatar_url,
       is_active,
       sort_order,
       created_at
FROM resources
WHERE tenant_id = $1
  AND deleted_at IS NULL
ORDER BY created_at;

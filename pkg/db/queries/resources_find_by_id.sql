-- name: FindResourceById :one
SELECT id,
       tenant_id,
       name,
       type,
       COALESCE(avatar_url, '') as avatar_url,
       is_active,
       sort_order,
       created_at,
       deleted_at
FROM resources
WHERE id = $1
LIMIT 1;

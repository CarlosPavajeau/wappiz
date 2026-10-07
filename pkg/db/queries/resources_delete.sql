-- name: DeleteResource :exec
UPDATE resources
SET deleted_at = now()
WHERE id = $1
  AND tenant_id = $2
  AND deleted_at IS NULL;

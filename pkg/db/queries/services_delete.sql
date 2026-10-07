-- name: DeleteService :execrows
-- is_active is the owner's pause switch, so deletion is tracked separately.
-- Already deleted rows are skipped so the original deletion time is kept;
-- zero affected rows means the service is gone.
UPDATE services
SET deleted_at = now()
WHERE id = $1
  AND tenant_id = $2
  AND deleted_at IS NULL;

-- name: LockLiveService :one
-- Service counterpart of LockLiveResource.
SELECT id
FROM services
WHERE id = $1
  AND tenant_id = $2
  AND deleted_at IS NULL
FOR SHARE;

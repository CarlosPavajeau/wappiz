-- name: LockLiveResource :one
-- Takes a share lock on a live resource for the rest of the transaction.
-- Deletion updates the row, so it waits for transactions holding this lock
-- and then sees their appointments; a transaction that locks after a
-- committed deletion gets no row.
SELECT id
FROM resources
WHERE id = $1
  AND tenant_id = $2
  AND deleted_at IS NULL
FOR SHARE;

-- name: UpdateFlowField :execrows
UPDATE tenant_flow_fields
SET question    = $3,
    is_required = $4,
    sort_order  = $5
WHERE id = $1
  AND tenant_id = $2;

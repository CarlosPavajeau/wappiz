-- name: UpdateFlowField :execrows
UPDATE tenant_flow_fields
SET question    = $3,
    is_required = $4,
    is_one_time = $5,
    sort_order  = $6
WHERE id = $1
  AND tenant_id = $2;

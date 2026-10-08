-- name: UpdateFlowField :execrows
UPDATE tenant_flow_fields
SET question    = $3,
    field_type  = $4,
    min_length  = $5,
    max_length  = $6,
    min_value   = $7,
    max_value   = $8,
    is_required = $9,
    is_one_time = $10,
    sort_order  = $11
WHERE id = $1
  AND tenant_id = $2;

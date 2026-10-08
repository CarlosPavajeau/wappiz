-- name: ToggleFlowField :execrows
UPDATE tenant_flow_fields
SET is_enabled = NOT is_enabled
WHERE id = $1
  AND tenant_id = $2;

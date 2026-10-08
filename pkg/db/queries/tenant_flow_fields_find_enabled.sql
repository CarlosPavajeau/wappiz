-- name: FindTenantEnabledFlowFields :many
SELECT id,
       field_key,
       question,
       field_type,
       min_length,
       max_length,
       min_value,
       max_value,
       is_required,
       is_one_time,
       sort_order
FROM tenant_flow_fields
WHERE tenant_id = $1
  AND is_enabled = true
ORDER BY sort_order, created_at;

-- name: CreateTenantPredefinedFlowFields :exec
WITH fields AS (
    SELECT
        sqlc.arg(field_keys)::text[] AS field_keys,
        sqlc.arg(sort_orders)::int[] AS sort_orders
)
INSERT INTO tenant_flow_fields (
    id,
    tenant_id,
    field_key,
    field_type,
    question,
    is_required,
    is_one_time,
    is_enabled,
    sort_order
)
SELECT
    gen_random_uuid(),
    $1,
    UNNEST(fields.field_keys),
    'predefined',
    NULL,
    false,
    false,
    false,
    UNNEST(fields.sort_orders)
FROM fields
ON CONFLICT (tenant_id, field_key) DO NOTHING;

-- name: InsertCustomTenantFlowField :one
INSERT INTO tenant_flow_fields (
    id,
    tenant_id,
    field_key,
    field_type,
    question,
    is_required,
    is_enabled,
    sort_order
)
VALUES (
    $1,
    $2,
    $3,
    'custom',
    $4,
    $5,
    true,
    $6
)
RETURNING id,
          field_key,
          field_type,
          question,
          is_required,
          is_enabled,
          sort_order;

-- name: InsertTenantFlowField :one
INSERT INTO tenant_flow_fields (
    id,
    tenant_id,
    field_key,
    question,
    is_required,
    is_one_time,
    is_enabled,
    sort_order
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    true,
    $7
)
RETURNING id,
          field_key,
          question,
          is_required,
          is_one_time,
          is_enabled,
          sort_order;

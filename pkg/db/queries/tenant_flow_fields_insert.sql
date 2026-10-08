-- name: InsertTenantFlowField :one
INSERT INTO tenant_flow_fields (
    id,
    tenant_id,
    field_key,
    question,
    field_type,
    min_length,
    max_length,
    min_value,
    max_value,
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
    $7,
    $8,
    $9,
    $10,
    $11,
    true,
    $12
)
RETURNING id,
          field_key,
          question,
          field_type,
          min_length,
          max_length,
          min_value,
          max_value,
          is_required,
          is_one_time,
          is_enabled,
          sort_order;

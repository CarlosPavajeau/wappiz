-- name: InsertTenantFlowField :exec
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
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9
);

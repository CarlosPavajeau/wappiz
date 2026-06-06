-- name: FindTenantOwnerEmail :one
SELECT u.email
FROM tenant_users tu
         JOIN users u ON u.id = tu.user_id
WHERE tu.tenant_id = $1
ORDER BY u.created_at
LIMIT 1;

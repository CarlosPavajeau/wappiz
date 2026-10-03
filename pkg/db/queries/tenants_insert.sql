-- name: InsertTenant :execrows
-- A taken slug inserts nothing (0 rows) instead of raising, so callers can
-- retry with another slug inside the same transaction; a unique violation
-- would abort it.
INSERT INTO tenants(
    id,
    name,
    slug,
    timezone,
    currency,
    appointments_this_month,
    month_reset_at,
    is_active,
    settings
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    0,
    $6,
    true,
    $7
)
ON CONFLICT (slug) DO NOTHING;

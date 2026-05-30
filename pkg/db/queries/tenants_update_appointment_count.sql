-- name: IncrementTenantAppointmentCount :execrows
UPDATE tenants
SET appointments_this_month = appointments_this_month + 1,
    updated_at              = NOW()
WHERE id = sqlc.arg(id)
  AND (
    sqlc.narg(max_appointments_per_month)::int IS NULL
        OR appointments_this_month < sqlc.narg(max_appointments_per_month)::int
    );

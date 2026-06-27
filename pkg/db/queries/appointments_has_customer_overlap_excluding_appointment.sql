-- name: HasCustomerOverlapExcludingAppointment :one
SELECT EXISTS (
    SELECT 1
    FROM appointments a
    WHERE a.tenant_id = sqlc.arg(tenant_id)
      AND a.customer_id = sqlc.arg(customer_id)
      AND a.id <> sqlc.arg(excluded_appointment_id)
      AND a.status NOT IN ('cancelled', 'no_show')
      AND a.starts_at < sqlc.arg(ends_at)
      AND a.ends_at > sqlc.arg(starts_at)
) AS has_overlap;

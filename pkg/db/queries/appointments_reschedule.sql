-- name: RescheduleAppointment :execrows
UPDATE appointments
SET starts_at             = sqlc.arg(starts_at),
    ends_at               = sqlc.arg(ends_at),
    reminder_24h_sent_at  = NULL,
    reminder_1h_sent_at   = NULL,
    updated_at            = NOW()
WHERE id = sqlc.arg(id)
  AND tenant_id = sqlc.arg(tenant_id)
  AND customer_id = sqlc.arg(customer_id)
  AND status = 'confirmed'::appointment_status;

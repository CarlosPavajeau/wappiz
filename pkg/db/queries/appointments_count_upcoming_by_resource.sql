-- name: CountUpcomingAppointmentsByResource :one
-- Appointments that still need the resource: every status that can still
-- happen, limited to those not yet over so stale rows nobody closed do not
-- block deletion forever.
SELECT count(*)
FROM appointments
WHERE resource_id = $1
  AND status IN ('pending', 'confirmed', 'check_in', 'in_progress')
  AND ends_at > now();

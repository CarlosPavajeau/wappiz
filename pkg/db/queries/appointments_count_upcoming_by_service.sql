-- name: CountUpcomingAppointmentsByService :one
-- Same rule as CountUpcomingAppointmentsByResource, keyed by service.
SELECT count(*)
FROM appointments
WHERE service_id = $1
  AND status IN ('pending', 'confirmed', 'check_in', 'in_progress')
  AND ends_at > now();

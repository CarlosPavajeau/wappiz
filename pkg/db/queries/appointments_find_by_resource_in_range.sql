-- name: FindResourceAppointmentsInRange :many
SELECT a.id,
       a.starts_at,
       a.ends_at,
       COALESCE(c.name, '') AS customer_name,
       s.name               AS service_name
FROM appointments a
         INNER JOIN customers c ON c.id = a.customer_id
         INNER JOIN services s ON s.id = a.service_id
WHERE a.resource_id = sqlc.arg(resource_id)
  AND a.starts_at < sqlc.arg(range_end)
  AND a.ends_at > sqlc.arg(range_start)
  AND a.status NOT IN ('cancelled', 'no_show')
ORDER BY a.starts_at;

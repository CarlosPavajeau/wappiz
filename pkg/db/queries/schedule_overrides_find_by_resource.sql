-- name: FindResourceScheduleOverrides :many
SELECT id,
       resource_id,
       start_date,
       end_date,
       kind,
       start_time,
       end_time,
       COALESCE(reason, '') as reason,
       created_at
FROM schedule_overrides
WHERE resource_id = sqlc.arg(resource_id)
  AND start_date <= sqlc.arg(to_date)
  AND end_date >= sqlc.arg(from_date)
ORDER BY start_date;

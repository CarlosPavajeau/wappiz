-- name: DeleteWorkingHoursByResource :exec
DELETE
FROM working_hours
WHERE resource_id = $1;

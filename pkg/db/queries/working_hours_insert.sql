-- name: InsertWorkingHour :exec
INSERT INTO working_hours(
    id,
    resource_id,
    day_of_week,
    start_time,
    end_time,
    is_active
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
);

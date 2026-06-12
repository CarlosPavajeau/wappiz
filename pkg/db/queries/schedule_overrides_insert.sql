-- name: InsertScheduleOverride :exec
INSERT INTO schedule_overrides(
    id,
    resource_id,
    start_date,
    end_date,
    kind,
    start_time,
    end_time,
    reason
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8
);

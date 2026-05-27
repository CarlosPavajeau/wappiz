-- name: InsertAppointmentFieldResponse :exec
INSERT INTO appointment_field_responses (
    id,
    appointment_id,
    field_key,
    response
)
VALUES (
    $1,
    $2,
    $3,
    $4
)
ON CONFLICT (appointment_id, field_key) DO UPDATE
SET response = EXCLUDED.response;

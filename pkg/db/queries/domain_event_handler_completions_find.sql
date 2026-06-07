-- name: FindCompletedDomainEventHandlers :many
SELECT handler_id
FROM domain_event_handler_completions
WHERE event_id = $1;

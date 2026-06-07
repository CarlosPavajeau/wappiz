-- name: InsertDomainEventHandlerCompletion :exec
INSERT INTO domain_event_handler_completions (event_id, handler_id)
VALUES ($1, $2)
ON CONFLICT (event_id, handler_id) DO NOTHING;

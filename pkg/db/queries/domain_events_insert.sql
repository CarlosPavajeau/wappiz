-- name: InsertDomainEvent :exec
INSERT INTO domain_events (id, tenant_id, event_type, payload)
VALUES ($1, $2, $3, $4);

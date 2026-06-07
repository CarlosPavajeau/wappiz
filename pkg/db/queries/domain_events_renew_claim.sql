-- name: RenewDomainEventClaim :execrows
UPDATE domain_events
SET claimed_at = NOW()
WHERE claim_id = sqlc.arg(claim_id)::uuid
  AND processed_at IS NULL
  AND failed_at IS NULL;

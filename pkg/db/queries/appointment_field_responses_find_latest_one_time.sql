-- name: FindLatestOneTimeFlowFieldAnswers :many
SELECT DISTINCT ON (afr.field_key)
       afr.field_key,
       afr.response
FROM appointment_field_responses afr
JOIN appointments a ON a.id = afr.appointment_id
WHERE a.tenant_id = $1
  AND a.customer_id = $2
  AND afr.field_key = ANY(sqlc.arg(field_keys)::text[])
ORDER BY afr.field_key, afr.created_at DESC;

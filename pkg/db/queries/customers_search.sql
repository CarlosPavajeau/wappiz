-- name: SearchCustomers :many
-- Filters are optional: a NULL argument disables its condition. Name matching
-- folds case and Spanish accents so "jose" finds "José"; phone matching runs
-- on bare digits so callers can search by any fragment of the number.
SELECT id,
       phone_number,
       name,
       is_blocked,
       no_show_count,
       late_cancel_count
FROM customers
WHERE tenant_id = sqlc.arg(tenant_id)
  AND (sqlc.narg(name)::text IS NULL
    OR strpos(translate(lower(name), 'áéíóúüàèìòù', 'aeiouuaeiou'),
              translate(lower(sqlc.narg(name)::text), 'áéíóúüàèìòù', 'aeiouuaeiou')) > 0)
  AND (sqlc.narg(phone_digits)::text IS NULL
    OR strpos(regexp_replace(phone_number, '\D', '', 'g'), sqlc.narg(phone_digits)::text) > 0)
  AND (sqlc.narg(is_blocked)::boolean IS NULL OR is_blocked = sqlc.narg(is_blocked)::boolean)
ORDER BY created_at DESC, id DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

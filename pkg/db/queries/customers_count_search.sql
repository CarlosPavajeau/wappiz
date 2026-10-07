-- name: CountSearchCustomers :one
-- Must apply exactly the same filters as SearchCustomers.
SELECT count(*)
FROM customers
WHERE tenant_id = sqlc.arg(tenant_id)
  AND (sqlc.narg(name)::text IS NULL
    OR strpos(translate(lower(name), 'áéíóúüàèìòù', 'aeiouuaeiou'),
              translate(lower(sqlc.narg(name)::text), 'áéíóúüàèìòù', 'aeiouuaeiou')) > 0)
  AND (sqlc.narg(phone_digits)::text IS NULL
    OR strpos(regexp_replace(phone_number, '\D', '', 'g'), sqlc.narg(phone_digits)::text) > 0)
  AND (sqlc.narg(is_blocked)::boolean IS NULL OR is_blocked = sqlc.narg(is_blocked)::boolean);

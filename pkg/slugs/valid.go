package slugs

import "regexp"

// MaxLength matches the tenants.slug column (varchar(100)).
const MaxLength = 100

// shape is the only form slugify can produce: lowercase ASCII letters, digits
// and hyphens.
var shape = regexp.MustCompile(`^[a-z0-9-]+$`)

// IsValid reports whether s could be a tenant slug. Public routes check it
// before touching the database, so scanner probes such as "robots.txt" or
// ".env" are rejected without a query.
func IsValid(s string) bool {
	return len(s) <= MaxLength && shape.MatchString(s)
}

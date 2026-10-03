// Package slugs guards the tenant slug namespace. Public booking pages are
// served at the web app root (/<slug>), so a slug must never shadow one of
// the app's own top-level paths.
package slugs

// reserved holds every top-level path segment the web app serves or may
// serve. Keep it in sync with web/apps/web/src/routes and the files in
// web/apps/web/public; extra entries are cheap, missing ones break routing.
var reserved = map[string]struct{}{
	"about":          {},
	"admin":          {},
	"api":            {},
	"app":            {},
	"assets":         {},
	"auth":           {},
	"b":              {},
	"banned":         {},
	"billing":        {},
	"blog":           {},
	"book":           {},
	"booking":        {},
	"contact":        {},
	"dashboard":      {},
	"docs":           {},
	"help":           {},
	"login":          {},
	"logout":         {},
	"onboarding":     {},
	"pricing":        {},
	"privacy":        {},
	"reset-password": {},
	"settings":       {},
	"sign-in":        {},
	"sign-up":        {},
	"signin":         {},
	"signup":         {},
	"static":         {},
	"support":        {},
	"terms":          {},
	"wappiz":         {},
	"www":            {},
}

// IsReserved reports whether slug collides with a path owned by the web app.
func IsReserved(slug string) bool {
	_, ok := reserved[slug]
	return ok
}

// Plain function on purpose: a server function here forces an HTTP round trip
// on every client-side navigation into a route that uses it, which shows the
// pending component even though the page itself is prerendered.
export const getCurrentYear = () => new Date().getFullYear()

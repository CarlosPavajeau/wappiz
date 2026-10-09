// Sizes that layout specs check overflow against: a small phone and a short
// laptop screen, where tall overlays are most likely to run off the page.
export const VIEWPORTS = [
  { height: 667, name: "mobile", width: 375 },
  { height: 720, name: "desktop", width: 1280 },
] as const

import { defineConfig } from "oxfmt"
import ultracite from "ultracite/oxfmt"

// oxfmt has no `extends`, so the preset is merged by spreading it. Keys below
// override the preset; everything else (arrowParens, printWidth, sortImports,
// sortPackageJson, ...) comes from ultracite.
export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "*.gen.ts",
    "*.md",
    "**/migrations/**",
    ".agents/**",
    ".claude/**",
  ],
  semi: false,
  sortTailwindcss: {
    ...ultracite.sortTailwindcss,
    preserveWhitespace: true,
    stylesheet: "./apps/web/src/index.css",
  },
})

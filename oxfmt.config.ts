import { defineConfig } from "oxfmt"
import ultracite from "ultracite/oxfmt"

export default defineConfig({
  arrowParens: "always",
  bracketSameLine: false,
  bracketSpacing: true,
  endOfLine: "lf",
  experimentalSortImports: {
    ignoreCase: true,
    newlinesBetween: true,
    order: "asc",
  },
  experimentalSortPackageJson: true,
  extends: [ultracite],
  ignorePatterns: ["*.gen.ts", "*.md", "**/migrations/**"],
  jsxSingleQuote: false,
  printWidth: 80,
  quoteProps: "as-needed",
  semi: false,
  singleQuote: false,
  sortTailwindcss: {
    functions: ["clsx", "cn"],
    preserveWhitespace: true,
    stylesheet: "./apps/web/src/index.css",
  },
  tabWidth: 2,
  trailingComma: "es5",
  useTabs: false,
})

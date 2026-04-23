import { defineConfig } from "oxlint"
import core from "ultracite/oxlint/core"
import react from "ultracite/oxlint/react"

export default defineConfig({
  extends: [core, react],
  ignorePatterns: [
    "*.gen.ts",
    "*.md",
    "**/migrations/**",
    ".agents/**",
    ".claude/**",
  ],
  rules: {
    "func-style": "off",
    "max-statements": [
      "warn",
      {
        max: 20,
      },
    ],
    "no-use-before-define": [
      "warn",
      {
        classes: true,
        functions: false,
        variables: true,
      },
    ],
    "typescript/consistent-type-definitions": ["error", "type"],
  },
})

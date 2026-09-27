import { defineConfig } from "oxlint"
import core from "ultracite/oxlint/core"
import react from "ultracite/oxlint/react"
import tanstack from "ultracite/oxlint/tanstack"

export default defineConfig({
  extends: [core, react, tanstack],
  ignorePatterns: [
    "*.gen.ts",
    "*.md",
    "**/migrations/**",
    ".agents/**",
    ".claude/**",
  ],
  overrides: [
    {
      // shadcn primitives put ARIA roles on styled `div`s. Swapping them for
      // `fieldset`/`output` would change their layout defaults.
      files: ["apps/web/src/components/ui/**"],
      rules: {
        "jsx-a11y/prefer-tag-over-role": "off",
      },
    },
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
    // The codebase declares components as `function Name() {}`; the preset
    // wants arrow functions.
    "react/function-component-definition": "off",
    // Controlled inputs are wired with React Hook Form's `field.onChange`,
    // which cannot be renamed to `handle*`.
    "react/jsx-handler-names": "off",
    "typescript/consistent-type-definitions": ["error", "type"],
    "sort-keys": "off",
  },
})

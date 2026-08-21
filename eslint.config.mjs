import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Installed skill tooling (.agents/.claude) — not part of the app, not ours to lint.
    ".agents/**",
    ".claude/**",
    // Generated migration SQL/metadata — never hand-edited or linted.
    "src/db/migrations/**",
  ]),
]);

export default eslintConfig;

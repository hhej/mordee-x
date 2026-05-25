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
    // Python notebooks env — not part of the Next.js app
    ".venv/**",
    // Playwright generated artifacts — html report bundles and trace zips
    "tests/e2e/playwright-report/**",
    "tests/e2e/test-results/**",
    "tests/e2e/__screenshots__/**",
  ]),
]);

export default eslintConfig;

import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use legacy .eslintrc-style config via FlatCompat so ESLint doesn't
// accidentally pick up a parent-directory flat config (e.g. A:\Code\eslint.config.js).
// Note: this repo uses legacy-style configs. Our installed @eslint/eslintrc FlatCompat
// requires recommendedConfig/allConfig parameters even if we don't extend eslint:recommended.
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: { rules: {} },
  allConfig: { rules: {} },
});

export default [
  ...compat.config({
    root: true,
    env: { browser: true, es2020: true },
    extends: [
      "plugin:@typescript-eslint/recommended",
      "plugin:react-hooks/recommended",
    ],
    ignorePatterns: [
      "dist",
      "dist-ess",
      // Compiled Firebase Functions output (source lives in functions/src)
      "functions/lib",
      "functions/lib/**",
      ".eslintrc.cjs",
    ],
    parser: "@typescript-eslint/parser",
    plugins: ["react-refresh"],
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
    overrides: [
      {
        files: [
          "src/frontend/pages/Dashboard.tsx",
          "src/frontend/pages/**/*Dashboard*.{ts,tsx}",
          "src/frontend/components/**/reports/**/*.{ts,tsx}",
        ],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: [
                    "*backend/context/HRContext*",
                    "*backend/context/StockContext*",
                    "*backend/context/FinanceContext*",
                    "*backend/context/BookingsContext*",
                    "*backend/context/POSContext*",
                  ],
                  message:
                    "Dashboards/reports must source module data via AnalyticsContext wrappers (e.g. useHRReportContext, useBookingsReportContext) instead of importing module contexts directly.",
                },
              ],
            },
          ],
        },
      },
    ],
  }),
];


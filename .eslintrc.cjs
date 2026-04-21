module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    'dist-ess',
    // Compiled Firebase Functions output (source lives in functions/src)
    'functions/lib',
    'functions/lib/**',
    '.eslintrc.cjs',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
  overrides: [
    {
      files: [
        'src/frontend/pages/Dashboard.tsx',
        'src/frontend/pages/**/*Dashboard*.{ts,tsx}',
        'src/frontend/pages/**/*Report*.{ts,tsx}',
        'src/frontend/pages/**/*Reports*.{ts,tsx}',
        'src/frontend/pages/**/*Reporting*.{ts,tsx}',
        'src/frontend/components/**/reports/**/*.{ts,tsx}',
        'src/frontend/components/**/*Report*.{ts,tsx}',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '*backend/context/HRContext*',
                  '*backend/context/StockContext*',
                  '*backend/context/FinanceContext*',
                  '*backend/context/BookingsContext*',
                  '*backend/context/POSContext*',
                ],
                message:
                  'Dashboards/reports must source module data via AnalyticsContext wrappers (e.g. useHRReportContext, useBookingsReportContext) instead of importing module contexts directly.',
              },
            ],
          },
        ],
      },
    },
  ],
}

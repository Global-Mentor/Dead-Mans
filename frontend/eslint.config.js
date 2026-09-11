import js from '@eslint/js'
import globals from 'globals'
import pluginQuery from '@tanstack/eslint-plugin-query'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const zodImportRestrictions = [
  {
    regex: '^zod(?:/|$)',
    allowTypeImports: true,
    message: 'Import schema builders from shared/validation/zod.ts to preserve strict CSP.',
  },
]

export default defineConfig([
  globalIgnores(['coverage', 'dist']),
  ...pluginQuery.configs['flat/recommended-strict'],
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/validation/zod.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: zodImportRestrictions }],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    ignores: ['src/shared/validation/zod.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...zodImportRestrictions,
            {
              group: ['**/features/**'],
              message: 'shared layer must not depend on feature modules',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.test.tsx', 'src/**/*.spec.tsx'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 450,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
])

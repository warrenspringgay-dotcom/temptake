// eslint.config.mjs — Next.js 15 flat config without extra deps
import next from 'eslint-config-next';

export default [
  // Next.js base (includes core-web-vitals)
  ...next(),
  // Global TS tweaks
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['.next/**', 'node_modules/**'],
    rules: {
      // So builds don’t fail while we’re wiring server actions / Supabase
      '@typescript-eslint/no-explicit-any': 'warn',
      // Reduce noise; allow "_" prefix to intentionally ignore
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }
      ],
    },
  },
  // Server actions: allow `any`
  {
    files: ['src/app/actions/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

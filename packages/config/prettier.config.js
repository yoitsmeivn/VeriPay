/**
 * Shared Prettier configuration for the VeriPay monorepo.
 *
 * @type {import('prettier').Config}
 */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
  overrides: [
    {
      files: ['*.md'],
      options: { proseWrap: 'preserve' },
    },
  ],
};

export default config;

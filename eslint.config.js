export default [
 {
  files: ['**/*.js'],
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', fetch: 'readonly', console: 'readonly', navigator: 'readonly', location: 'readonly', requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly', addEventListener: 'readonly', performance: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', URL: 'readonly', URLSearchParams: 'readonly' } },
  rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] }
 }
]

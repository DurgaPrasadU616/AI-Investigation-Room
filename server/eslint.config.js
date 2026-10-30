import js from '@eslint/js';

export default [
  { ignores: ['uploads/**'] },
  js.configs.recommended,
  { files: ['src/**/*.js'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly', setImmediate: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', AbortSignal: 'readonly' } }, rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
];

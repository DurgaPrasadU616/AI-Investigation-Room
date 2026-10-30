import js from '@eslint/js';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**'] },
  js.configs.recommended,
  { files: ['src/**/*.{js,jsx}'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly' }, parserOptions: { ecmaFeatures: { jsx: true } } }, settings: { react: { version: 'detect' } }, plugins: { react, 'react-hooks': hooks }, rules: { ...react.configs.recommended.rules, ...hooks.configs.recommended.rules, 'react/react-in-jsx-scope': 'off', 'react/jsx-uses-react': 'off', 'react/prop-types': 'off', 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' }] } },
];

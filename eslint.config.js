import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Layer rules from .agents/architecture.md section 2.1.
 * app -> features -> state -> services -> core, with ui and i18n as side layers.
 * Patterns use gitignore syntax, so "**" + "/services/**" matches relative imports too.
 */
const FEATURES = [
  'auth',
  'readings',
  'tank-status',
  'proposals',
  'rules',
  'publication',
  'closure',
  'minutes',
  'incidents',
  'evaluation',
  'admin',
  'public',
];

const REACT_PACKAGES = ['react', 'react-dom', 'react-dom/*', 'react-router', 'react-router/*'];

const layerPatterns = (layers, message) => ({
  group: layers.map((layer) => `**/${layer}/**`).concat(layers.map((layer) => `**/${layer}`)),
  message,
});

const restrict = (...patterns) => ({
  'no-restricted-imports': ['error', { patterns, paths: [] }],
});

const reactPatterns = {
  group: REACT_PACKAGES,
  message: 'This layer must not depend on React (architecture.md 2.1).',
};

// Gitignore-style negation cannot re-include a file under an excluded folder,
// so the internal folders are listed explicitly.
const SERVICE_INTERNALS = [
  '**/services/http/**',
  '**/services/offline/**',
  '**/services/session/**',
  '**/services/preferences/**',
  '**/services/api/adapters/**',
  '**/services/api/endpoints/**',
  '**/services/api/config',
];

const CORE_NON_FORMAT = [
  'forms',
  'proposal',
  'commands',
  'connection',
  'errors',
  'policy',
  'time',
].map((folder) => `**/core/${folder}/**`);

const featureIsolation = FEATURES.map((feature) => {
  const others = FEATURES.filter((other) => other !== feature);
  return {
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: restrict(
      layerPatterns(['app'], 'features must not import from app.'),
      {
        group: SERVICE_INTERNALS,
        message: 'features only use CaudalApi and generated types from services.',
      },
      {
        group: others.flatMap((other) => [
          `../${other}`,
          `../${other}/**`,
          `**/features/${other}/**`,
        ]),
        message: 'features must not import other features; share through state, core or ui.',
      },
      { group: ['dexie', 'dexie/*'], message: 'features must not access IndexedDB directly.' },
    ),
  };
});

const BROWSER_GLOBALS_BLOCKED = [
  'fetch',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'document',
  'window',
];

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      'src/services/api/schema.d.ts',
      'playwright-report',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [0, 1],
          enforceConst: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
        },
      ],
      'no-eval': 'error',
      'no-implied-eval': 'off',
      '@typescript-eslint/no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is forbidden (security.md section 5).',
        },
        {
          selector: "Property[key.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is forbidden (security.md section 5).',
        },
        {
          selector: 'MemberExpression[property.name=/^(innerHTML|outerHTML|insertAdjacentHTML)$/]',
          message: 'Raw HTML insertion is forbidden (security.md section 5).',
        },
        {
          selector: "CallExpression[callee.object.name='document'][callee.property.name='write']",
          message: 'document.write is forbidden (security.md section 5).',
        },
        {
          selector: 'JSXText[value=/\\S/]',
          message: 'Visible text must come from src/i18n/es.ts, not from JSX literals.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'localStorage',
          message: 'Use src/services/preferences only.',
        },
        {
          object: 'window',
          property: 'sessionStorage',
          message: 'Use src/services/preferences only.',
        },
      ],
    },
  },
  // Layers
  {
    files: ['src/core/**/*.ts'],
    rules: {
      ...restrict(
        layerPatterns(
          ['services', 'state', 'features', 'app', 'ui'],
          'core must not depend on upper layers (architecture.md 2.1).',
        ),
        reactPatterns,
        { group: ['dexie', 'dexie/*'], message: 'core must not touch IndexedDB.' },
      ),
      'no-restricted-globals': [
        'error',
        ...BROWSER_GLOBALS_BLOCKED.map((name) => ({
          name,
          message: 'core is pure logic: inject collaborators instead of using browser globals.',
        })),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Inject Clock instead of Date.now().' },
        { object: 'Math', property: 'random', message: 'Inject IdGenerator or Random instead.' },
      ],
    },
  },
  {
    files: ['src/services/**/*.{ts,tsx}'],
    rules: restrict(
      layerPatterns(
        ['state', 'features', 'app', 'ui'],
        'services must not depend on upper layers.',
      ),
      reactPatterns,
    ),
  },
  {
    files: ['src/state/**/*.{ts,tsx}'],
    rules: restrict(
      layerPatterns(['features', 'app', 'ui'], 'state must not depend on features, app or ui.'),
    ),
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...['fetch', 'localStorage', 'sessionStorage', 'indexedDB'].map((name) => ({
          name,
          message:
            'features go through CaudalApi and hooks, never through browser storage or fetch.',
        })),
      ],
    },
  },
  ...featureIsolation,
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: restrict(
      layerPatterns(['services', 'state', 'features', 'app'], 'ui is presentational only.'),
      {
        group: CORE_NON_FORMAT,
        message: 'ui may only import formatting utilities from core.',
      },
    ),
  },
  // Local preferences are the only place allowed to use web storage.
  {
    files: ['src/services/preferences/**/*.ts'],
    rules: { 'no-restricted-properties': 'off', 'no-restricted-globals': 'off' },
  },
  // Tests and fixtures
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['eslint.config.js', 'vite.config.ts', 'vitest.config.ts', 'scripts/**/*.{js,mjs,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);

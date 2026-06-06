module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
    },
    plugins: ['@typescript-eslint'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    env: {
        node: true,
        es2022: true,
    },
    rules: {
        // TypeScript
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/consistent-type-imports': 'error',

        // 通用
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'no-debugger': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
        eqeqeq: ['error', 'always'],

        // ✅ 使用 AST 选择器精确禁用 Date.now() 和 performance.now()
        'no-restricted-syntax': [
            'error',
            {
                selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
                message:
                    'Use HighResTimer from utils/timer.ts instead of Date.now() for measurements',
            },
            {
                selector:
                    "CallExpression[callee.object.name='performance'][callee.property.name='now']",
                message:
                    'Use HighResTimer from utils/timer.ts instead of performance.now() for measurements',
            },
        ],
    },
    overrides: [
        {
            files: ['src/utils/timer.ts'],
            rules: {
                'no-restricted-syntax': 'off',
            },
        },
        {
            files: ['**/*.spec.ts', '**/*.spec.js'],
            rules: {
                'no-restricted-syntax': 'off',
            },
        },
    ],
    ignorePatterns: ['dist/', 'node_modules/', 'circuits/build/', '**/*.js'],
};

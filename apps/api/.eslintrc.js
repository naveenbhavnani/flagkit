module.exports = {
  extends: ['../../packages/config/.eslintrc.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    '**/*.test.ts',
    '**/__tests__',
    'src/test/**',
    'src/routes/analytics.routes.ts',
    'src/services/analytics.service.ts',
    'src/scripts/*analytics*',
  ],
};

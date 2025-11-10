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
  ],
};

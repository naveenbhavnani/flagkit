module.exports = {
  extends: ['../../packages/config/.eslintrc.js'],
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.test.json'],
    tsconfigRootDir: __dirname,
  },
};

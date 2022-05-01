module.exports = {
  root: true,
  rules: {
    '@typescript-eslint/semi': 'off',
  },
  extends: 'airbnb-typescript/base',
  plugins: ['import', 'prettier'],
  parserOptions: {
    project: './tsconfig.eslint.json',
  },
}

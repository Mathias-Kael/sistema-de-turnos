/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom','<rootDir>/setupTests.ts'],
  moduleNameMapper: { '\\.(css|scss|sass)$': 'identity-obj-proxy' },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[tj]sx?$',
  // si mantenés "type":"module", agrega:
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: { 'ts-jest': { useESM: true, tsconfig: true } }
};
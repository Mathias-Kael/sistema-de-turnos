/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom','<rootDir>/setupTests.ts'],
  moduleNameMapper: { '\\.(css|scss|sass)$': 'identity-obj-proxy' },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[tj]sx?$',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { useESM: true, tsconfig: true }]
  },
  // Opt-in para diagnosticar tiempos lentos si es necesario
  // verbose: true,
};
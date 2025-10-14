/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.polyfills.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-dom','<rootDir>/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/$1',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[tj]sx?$',
  // Ignoramos la carpeta e2e porque Playwright se ejecuta fuera de Jest
  testPathIgnorePatterns: ['<rootDir>/e2e/'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { useESM: true, tsconfig: true }]
  },
  // Opt-in para diagnosticar tiempos lentos si es necesario
  // verbose: true,
};
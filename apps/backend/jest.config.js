/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/teardown.ts'],
  verbose: true,
  forceExit: false,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  maxWorkers: 1,
};

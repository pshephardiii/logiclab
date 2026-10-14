module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  clearMocks: true,
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/integration/'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/**/*.test.ts'],
};

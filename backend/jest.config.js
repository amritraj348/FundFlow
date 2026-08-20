module.exports = {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  // setupFiles run before each test file's own top-level requires (needed so
  // config/env.js sees test env vars + the in-memory MONGO_URI already set);
  // setupFilesAfterEnv run after, once the test framework itself is ready.
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 20000,
  // --runInBand (see package.json) is what actually forces single-worker
  // execution; this just keeps Jest from assuming parallel-safe test files,
  // since every test in this suite shares one mongodb-memory-server instance.
  maxWorkers: 1,
};

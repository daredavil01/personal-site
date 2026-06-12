const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // parseNowCms.js uses Vite's import.meta.glob macro, which the CJS test
    // runtime cannot evaluate — substitute a no-op stub.
    '^.+/utils/parseNowCms$': '<rootDir>/src/utils/parseNowCms.jest-stub.js',
    '^.+\\.(css|less|scss)$': 'babel-jest',
    '^.+\\.md(\\?url)?$': 'markdown-to-jsx',
  },
};

module.exports = config;

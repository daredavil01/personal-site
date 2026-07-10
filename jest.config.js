const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // parseNowCms.js uses Vite's import.meta.glob macro, which the CJS test
    // runtime cannot evaluate — substitute a no-op stub.
    '^.+/utils/parseNowCms$': '<rootDir>/src/utils/parseNowCms.jest-stub.js',
    // supabaseClient.js reads import.meta.env (also a Vite-only macro) — stub it
    // so the content layer resolves to empty data under jsdom.
    '^.+/supabaseClient$': '<rootDir>/src/lib/supabaseClient.jest-stub.js',
    '^.+\\.css$': 'babel-jest',
    '^.+\\.md(\\?url)?$': 'markdown-to-jsx',
  },
};

module.exports = config;

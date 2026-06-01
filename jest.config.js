/**
 * Jest config — uses babel-jest (pure JavaScript, no native binaries) so it
 * runs under environments that block native .node addons. Babel is scoped to
 * Jest here (no root babel.config) so Next.js keeps using SWC for builds.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.[tj]sx?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
};

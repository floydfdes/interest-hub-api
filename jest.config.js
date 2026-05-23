/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/tests/**/*.test.ts"],
  watchman: false,
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {}],
  },
};

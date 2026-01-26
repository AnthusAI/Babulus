export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom", // Changed to jsdom for React testing
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@/(.*)$": "<rootDir>/$1", // Support Next.js @ imports
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          jsx: "react",
        },
      },
    ],
  },
  testMatch: [
    "**/tests/**/*.test.ts",
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
  ],
  collectCoverageFrom: [
    "lib/**/*.ts",
    "lib/**/*.tsx",
    "components/**/*.tsx",
    "!lib/**/*.d.ts",
    "!**/__tests__/**",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};

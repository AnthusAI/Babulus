export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom", // Changed to jsdom for React testing
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  modulePathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/.amplify/"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@/(.*)$": "<rootDir>/$1", // Support Next.js @ imports
    "^@videoml/player$": "<rootDir>/../../../VideoML/player/src/index.ts",
    "^@videoml/player/react$": "<rootDir>/../../../VideoML/player/src/react.tsx",
    "^@videoml/stdlib$": "<rootDir>/../../../VideoML/stdlib/src/index.ts",
    "^@videoml/stdlib/dom$": "<rootDir>/../../../VideoML/stdlib/src/dom/index.ts",
    "^@videoml/stdlib/tokens$": "<rootDir>/../../../VideoML/stdlib/src/tokens/index.ts",
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

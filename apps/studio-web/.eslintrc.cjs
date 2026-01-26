module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "next/typescript"],
  plugins: ["unused-imports"],
  rules: {
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-var-requires": "off",
    "react/no-unescaped-entities": "off",
  },
};
